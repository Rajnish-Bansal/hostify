const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/**
 * Scrapes an external URL for property details.
 * Optimized for standard property data structures.
 */
async function scrapeExternal(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Go to the URL
    console.log(`[Scraper] Visiting: \${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extract the JSON data from the script tag with id="env-setup-dot-json" or "__INITIAL_STATE__"
    // Extract the JSON data from script tags
    const dataState = await page.evaluate(() => {
      // 1. Try script#data-deferred-state-0 (Very common in 2024/2026)
      const deferredScript = document.querySelector('script#data-deferred-state-0');
      if (deferredScript) {
        try {
          const parsed = JSON.parse(deferredScript.textContent);
          if (parsed.niobeClientData) return parsed;
        } catch (e) {}
      }

      // 2. Try niobe-minimal-client-data-atom
      const niobeScript = document.querySelector('script#niobe-minimal-client-data-atom');
      if (niobeScript) {
        try {
          return JSON.parse(niobeScript.textContent);
        } catch (e) {}
      }

      // 3. Try env-setup-dot-json
      const envScript = document.querySelector('script#env-setup-dot-json');
      if (envScript) {
        try {
          return JSON.parse(envScript.textContent);
        } catch (e) {}
      }

      // 4. Fallback search
      const allScripts = Array.from(document.querySelectorAll('script'));
      const fallback = allScripts.find(s => s.textContent.includes('niobeClientData') || s.textContent.includes('__INITIAL_STATE__'));
      if (fallback) {
        try {
          const match = fallback.textContent.match(/({.*"niobeClientData".*})/) || 
                        fallback.textContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
          if (match) return JSON.parse(match[1]);
        } catch (e) {}
      }

      return null;
    });

    if (!dataState) {
      const timestamp = new Date().getTime();
      const screenshotPath = \`error_screenshot_\${timestamp}.png\`;
      const htmlPath = \`error_page_\${timestamp}.html\`;
      
      console.error(\`[Scraper] Extraction failed. Capturing debug info to \${screenshotPath} and \${htmlPath}\`);
      
      await page.screenshot({ path: screenshotPath }).catch(e => console.error('Failed to take screenshot', e.message));
      const html = await page.content();
      require('fs').writeFileSync(htmlPath, html);
      
      throw new Error('Failed to extract data state from property page');
    }

    // --- MAPPING LOGIC ---
    let title, description, location, price, photos, amenities, guests, bedrooms, beds, bathrooms;

    // A. Extract presentation payload
    // niobeClientData is usually an array of arrays: [[key, data], [key, data], ...]
    const atoms = dataState.niobeClientData || dataState.niobeMinimalClientData || [];
    const pdpAtom = atoms.find(atom => Array.isArray(atom) && atom[0].includes('StaysPdpSections'));
    const presentation = pdpAtom ? pdpAtom[1]?.data?.presentation?.stayProductDetailPage : 
                         dataState[0]?.[1]?.data?.presentation?.stayProductDetailPage;

    if (presentation) {
      const metadata = presentation.sections?.metadata?.sharingConfig || {};
      const sections = presentation.sections?.sections || [];

      // Basic info
      title = metadata.title || 'Unknown Title';
      description = metadata.description?.html || metadata.description || '';
      location = metadata.location || metadata.p3SummaryAddress || 'Unknown Location';

      // Photos
      const photoSection = sections.find(s => s.sectionId === 'PHOTO_TOUR_DEFAULT');
      photos = photoSection?.section?.mediaItems?.map(item => item.baseUrl) || [];

      // Price
      const priceSection = sections.find(s => s.sectionId === 'BOOK_IT_FLOATING_FOOTER');
      const priceRaw = priceSection?.section?.structuredDisplayPrice?.primaryLine?.price || '5000';
      price = typeof priceRaw === 'string' ? parseInt(priceRaw.replace(/[^0-9]/g, '')) : (parseInt(priceRaw) || 5000);

      // Amenities
      const amenitySection = sections.find(s => s.sectionId === 'AMENITIES_DEFAULT');
      amenities = amenitySection?.section?.seeAllAmenitiesGroups?.flatMap(g => g.amenities.map(a => a.title)) || [];

      // Room Details
      const roomDetails = sections.find(s => s.sectionId === 'OVERVIEW_DEFAULT_V2')?.section?.detailItems || [];
      guests = parseInt(roomDetails.find(d => d.title?.includes('guest'))?.title) || 2;
      bedrooms = parseInt(roomDetails.find(d => d.title?.includes('bedroom'))?.title) || 1;
      beds = parseInt(roomDetails.find(d => d.title?.includes('bed'))?.title) || 1;
      bathrooms = parseInt(roomDetails.find(d => d.title?.includes('bath'))?.title) || 1;
      
    } else {
      console.log('[Scraper] Presentation data not found, using head metadata');
      // Look for title in document head or use DOM fallback
      title = await page.title();
      location = 'Unknown Location';
      price = 5000;
      photos = [];
      amenities = [];
    }

    return {
      title,
      description,
      location,
      price,
      photos,
      amenities: amenities.slice(0, 10), // Limit to top 10
      guests,
      bedrooms,
      beds,
      bathrooms,
      originalUrl: url
    };

  } catch (error) {
    console.error(\`[Scraper Error]: \${error.message}\`);
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeExternal };
