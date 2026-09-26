import { Product, ProductBundle } from '../types';

export interface GitHubSyncOptions {
  repo: string;          // e.g. "bdkhatibazar-sudo/ekdor" or "bdkhatibazar-sudo/admin.ekdor"
  token: string;         // Personal Access Token (PAT)
  branch?: string;       // default "main"
  productsPath?: string; // default "products.json"
  categoriesPath?: string; // default "categories.json"
  bundlePath?: string;   // default "bundle.json"
  commitMessage?: string;
}

export interface SyncFileResult {
  filename: string;
  success: boolean;
  message: string;
  sha?: string;
  htmlUrl?: string;
}

export interface SyncOverallResult {
  success: boolean;
  message: string;
  results: SyncFileResult[];
}

// Default category images from ekdor.net
export const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'সব': 'https://ik.imagekit.io/38gsfaqji/images/t1.webp',
  'হিজামা': 'https://ik.imagekit.io/38gsfaqji/images/t2.webp',
  'হিজামা কাপ': 'https://ik.imagekit.io/38gsfaqji/images/t7.webp',
  'থেরাপি': 'https://ik.imagekit.io/38gsfaqji/images/thh.webp',
  'মধু': 'https://ik.imagekit.io/38gsfaqji/images/m111.webp',
  'তেল': 'https://ik.imagekit.io/38gsfaqji/images/tl5.webp',
  'ঘি': 'https://ik.imagekit.io/38gsfaqji/images/gh500.webp',
};

/**
 * 1. Generate products.json matching ekdor.net structure
 */
export function generateProductsJson(products: Product[]): any[] {
  return products.map((p, idx) => {
    let pdIdVal: any = p.pdId;
    if (pdIdVal === undefined || pdIdVal === null || pdIdVal === '') {
      pdIdVal = !isNaN(Number(p.id)) ? Number(p.id) : p.id;
    } else if (!isNaN(Number(pdIdVal))) {
      pdIdVal = Number(pdIdVal);
    }

    return {
      'ক্রমিক': p.serialNo !== undefined ? p.serialNo : (idx + 1),
      'PD_ID': pdIdVal,
      'ধরন': p.category || 'অন্যান্য',
      'নাম': p.banglaName || p.name,
      'দর': p.regularPrice !== undefined && p.regularPrice > 0 ? p.regularPrice : p.sellingPrice,
      'বিক্রি': p.sellingPrice,
      'স্টক': p.stockQty > 0,
      'active': p.isActive !== false,
      'বর্ণনা': p.description || '',
      'ছবির লিংক': p.imageUrl || '',
      'ভিডিওর লিংক': p.videoUrl && p.videoUrl.trim() !== '' ? p.videoUrl : null,
      'Dhaka_City': p.deliveryDhaka !== undefined ? p.deliveryDhaka : (p.defaultDeliveryCharge || 70),
      'Sub_Dhaka': p.deliverySubDhaka !== undefined ? p.deliverySubDhaka : 100,
      'Outside_Dhaka': p.deliveryOutside !== undefined ? p.deliveryOutside : 130,
      'search_keywords': p.searchKeywords || '',
    };
  });
}

/**
 * 2. Generate categories.json matching ekdor.net structure
 */
export function generateCategoriesJson(
  products: Product[],
  knownCategoryImages?: Record<string, string>
): Array<{ 'নাম': string; 'ছবির লিংক': string }> {
  const imageMap = { ...DEFAULT_CATEGORY_IMAGES, ...(knownCategoryImages || {}) };

  // Collect unique categories in sequence: 'সব' first, then defined categories, then any extra
  const defaultOrder = ['সব', 'হিজামা', 'হিজামা কাপ', 'থেরাপি', 'মধু', 'তেল', 'ঘি'];
  const productCats = new Set<string>();
  products.forEach((p) => {
    if (p.category && p.category.trim()) {
      productCats.add(p.category.trim());
    }
  });

  const finalOrder: string[] = [];
  defaultOrder.forEach((c) => {
    finalOrder.push(c);
    productCats.delete(c);
  });
  productCats.forEach((c) => {
    finalOrder.push(c);
  });

  return finalOrder.map((catName) => ({
    'নাম': catName,
    'ছবির লিংক': imageMap[catName] || 'https://ik.imagekit.io/38gsfaqji/images/t1.webp',
  }));
}

/**
 * 3. Generate bundle.json matching ekdor.net structure
 */
export function generateBundleJson(bundles: ProductBundle[] = []): any[] {
  const result: any[] = [];

  bundles.forEach((b) => {
    let bIdVal: any = b.bundleId;
    if (bIdVal === undefined || bIdVal === null || bIdVal === '') {
      bIdVal = !isNaN(Number(b.id)) ? Number(b.id) : b.id;
    } else if (!isNaN(Number(bIdVal))) {
      bIdVal = Number(bIdVal);
    }

    if (b.items && b.items.length > 0) {
      b.items.forEach((item) => {
        let pIdVal: any = item.productId;
        if (pIdVal && !isNaN(Number(pIdVal))) {
          pIdVal = Number(pIdVal);
        }

        result.push({
          'Bundle_ID': bIdVal,
          'PD_ID': pIdVal,
          'নাম': item.productName,
          'বিক্রি': item.bundleSellingPrice || item.originalSellingPrice,
          'Quantity': item.quantity || 1,
        });
      });
    }
  });

  return result;
}

/**
 * Encode string to Base64 in UTF-8 safely
 */
function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Upload single file to GitHub repository using GitHub REST API
 */
async function uploadFileToGitHub(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
  contentStr: string,
  commitMsg: string
): Promise<SyncFileResult> {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
  };

  // 1. Get existing file sha if it exists
  let existingSha: string | undefined = undefined;
  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: 'GET',
      headers,
    });
    if (getRes.ok) {
      const getData = await getRes.json();
      existingSha = getData.sha;
    } else if (getRes.status !== 404) {
      const errText = await getRes.text();
      console.warn(`Could not check existing file ${filePath}: ${errText}`);
    }
  } catch (err: any) {
    console.warn(`Error getting file sha for ${filePath}:`, err);
  }

  // 2. Put file to GitHub
  const base64Content = utf8ToBase64(contentStr);
  const putBody: any = {
    message: commitMsg,
    content: base64Content,
    branch,
  };
  if (existingSha) {
    putBody.sha = existingSha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({ message: putRes.statusText }));
    const errMsg = errData.message || `HTTP ${putRes.status}`;
    return {
      filename: filePath,
      success: false,
      message: `আপডেট ব্যর্থ: ${errMsg}`,
    };
  }

  const resData = await putRes.json();
  return {
    filename: filePath,
    success: true,
    message: 'সফলভাবে পুশ হয়েছে',
    sha: resData.content?.sha,
    htmlUrl: resData.content?.html_url,
  };
}

/**
 * Sync all 3 files to GitHub (products.json, categories.json, bundle.json)
 */
export async function syncAllToGitHub(
  options: GitHubSyncOptions,
  products: Product[],
  bundles: ProductBundle[] = []
): Promise<SyncOverallResult> {
  const {
    repo,
    token,
    branch = 'main',
    productsPath = 'products.json',
    categoriesPath = 'categories.json',
    bundlePath = 'bundle.json',
    commitMessage = 'Update store catalog (products, categories, bundles) from Ekdor Admin POS',
  } = options;

  if (!repo || !repo.trim()) {
    return {
      success: false,
      message: 'গিটহাব রিপোজিটরির নাম দেওয়া হয়নি (যেমন: bdkhatibazar-sudo/ekdor)',
      results: [],
    };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      message: 'GitHub Personal Access Token (PAT) দেওয়া হয়নি। সেটিংস থেকে টোকেন সেট করুন।',
      results: [],
    };
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');

  // 1. Prepare JSON contents formatted with 2 spaces
  const productsData = generateProductsJson(products);
  const categoriesData = generateCategoriesJson(products);
  const bundleData = generateBundleJson(bundles);

  const productsJsonStr = JSON.stringify(productsData, null, 2);
  const categoriesJsonStr = JSON.stringify(categoriesData, null, 2);
  const bundleJsonStr = JSON.stringify(bundleData, null, 2);

  // Try server proxy first to bypass any browser CORS or network issues
  try {
    const proxyRes = await fetch('/api/github/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: cleanRepo,
        token: token.trim(),
        branch,
        commitMessage,
        files: [
          { path: productsPath, content: productsJsonStr },
          { path: categoriesPath, content: categoriesJsonStr },
          { path: bundlePath, content: bundleJsonStr },
        ],
      }),
    });

    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      return proxyData;
    }
  } catch (proxyErr) {
    console.warn('Backend proxy unavailable, falling back to direct browser GitHub API call:', proxyErr);
  }

  // Fallback: Direct GitHub API call from browser
  const results: SyncFileResult[] = [];

  // 1. Upload products.json
  const prodRes = await uploadFileToGitHub(
    token,
    cleanRepo,
    branch,
    productsPath,
    productsJsonStr,
    `Update ${productsPath} (${products.length} products) from Ekdor Admin`
  );
  results.push(prodRes);

  // 2. Upload categories.json
  const catRes = await uploadFileToGitHub(
    token,
    cleanRepo,
    branch,
    categoriesPath,
    categoriesJsonStr,
    `Update ${categoriesPath} from Ekdor Admin`
  );
  results.push(catRes);

  // 3. Upload bundle.json
  const bundleRes = await uploadFileToGitHub(
    token,
    cleanRepo,
    branch,
    bundlePath,
    bundleJsonStr,
    `Update ${bundlePath} from Ekdor Admin`
  );
  results.push(bundleRes);

  const allSuccess = results.every((r) => r.success);
  const successCount = results.filter((r) => r.success).length;

  return {
    success: allSuccess,
    message: allSuccess
      ? '৩টি ফাইলই (products.json, categories.json, bundle.json) সফলভাবে আপনার কাস্টমার সাইটের গিটহাবে আপডেট হয়েছে!'
      : `${results.length} টির মধ্যে ${successCount} টি ফাইল আপডেট হয়েছে। কিছু ফাইলে সমস্যা হয়েছে।`,
    results,
  };
}

/**
 * Trigger browser download of a JSON file
 */
export function downloadJsonFile(filename: string, data: any) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download all 3 files at once
 */
export function downloadAllJsonFiles(products: Product[], bundles: ProductBundle[] = []) {
  const productsData = generateProductsJson(products);
  const categoriesData = generateCategoriesJson(products);
  const bundleData = generateBundleJson(bundles);

  downloadJsonFile('products.json', productsData);
  setTimeout(() => downloadJsonFile('categories.json', categoriesData), 300);
  setTimeout(() => downloadJsonFile('bundle.json', bundleData), 600);
}
