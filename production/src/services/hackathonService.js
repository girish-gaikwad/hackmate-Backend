const { URLSearchParams } = require("url");

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_USER_AGENT =
  process.env.HACKATHON_USER_AGENT ||
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36";

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeProtocolUrl(url) {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function stripHtml(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function withTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function buildUnstopQuery(query) {
  const page = toPositiveInt(query.page, 1);
  const perPage = toPositiveInt(query.unstopPerPage || query.per_page, 18);

  const params = new URLSearchParams({
    opportunity: "hackathons",
    page: String(page),
    per_page: String(perPage),
    oppstatus: query.oppstatus || "open",
    sortBy: query.sortBy || "",
    orderBy: query.orderBy || "",
    filter_condition: query.filter_condition || "",
  });

  if (query.undefined !== undefined) {
    params.set("undefined", String(query.undefined));
  }

  return { page, perPage, queryString: params.toString() };
}

function buildDevpostQuery(query) {
  const page = toPositiveInt(query.page, 1);
  const perPage = toPositiveInt(query.devpostPerPage || query.devpost_per_page, 9);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(perPage));

  // Allow passthrough of devpost filters using "dp_" prefix in your API query.
  // Example: dp_status[]=open&dp_themes[]=Machine%20Learning/AI
  Object.entries(query).forEach(([key, value]) => {
    if (!key.startsWith("dp_")) return;
    const targetKey = key.slice(3);

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined && v !== null && v !== "") {
          params.append(targetKey, String(v));
        }
      });
      return;
    }

    if (value !== undefined && value !== null && value !== "") {
      params.append(targetKey, String(value));
    }
  });

  return { page, perPage, queryString: params.toString() };
}

async function fetchJson(url, headers, timeoutMs) {
  const timeout = withTimeoutSignal(timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: timeout.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    return response.json();
  } finally {
    timeout.clear();
  }
}

function normalizeDevpostItem(item) {
  return {
    id: `devpost-${item.id}`,
    source: "devpost",
    sourceId: item.id,
    title: item.title || null,
    url: item.url || null,
    thumbnailUrl: normalizeProtocolUrl(item.thumbnail_url),
    organization: item.organization_name || null,
    location: item.displayed_location?.location || null,
    mode: item.displayed_location?.icon === "globe" ? "online" : null,
    status: item.open_state || null,
    deadlineText: item.time_left_to_submission || null,
    datesText: item.submission_period_dates || null,
    registrationsCount: item.registrations_count || 0,
    prizeAmount: stripHtml(item.prize_amount),
    themes: Array.isArray(item.themes)
      ? item.themes.map((theme) => theme.name).filter(Boolean)
      : [],
    sourceData: {
      startSubmissionUrl: item.start_a_submission_url || null,
      submissionGalleryUrl: item.submission_gallery_url || null,
      inviteOnly: Boolean(item.invite_only),
      featured: Boolean(item.featured),
    },
  };
}

function normalizeUnstopItem(item) {
  const city = item.address_with_country_logo?.city;
  const state = item.address_with_country_logo?.state;

  let location = null;
  if (city && state) {
    location = `${city}, ${state}`;
  } else if (city) {
    location = city;
  } else if (state) {
    location = state;
  } else if (item.region) {
    location = item.region;
  }

  return {
    id: `unstop-${item.id}`,
    source: "unstop",
    sourceId: item.id,
    title: item.title || null,
    url: item.seo_url || item.short_url || null,
    thumbnailUrl: item.logoUrl2 || null,
    organization: item.organisation?.name || null,
    location,
    mode: item.region || null,
    status: item.status || null,
    deadlineText: item.regnRequirements?.remain_days || null,
    datesText: item.end_date || null,
    registrationsCount: item.registerCount || 0,
    prizeAmount: null,
    themes: Array.isArray(item.required_skills)
      ? item.required_skills.map((skill) => skill.skill_name || skill.skill).filter(Boolean)
      : [],
    shortDescription: stripHtml(item.details).slice(0, 300) || null,
    sourceData: {
      publicUrl: item.public_url || null,
      shortUrl: item.short_url || null,
      minTeamSize: item.regnRequirements?.min_team_size || null,
      maxTeamSize: item.regnRequirements?.max_team_size || null,
      endDate: item.end_date || null,
    },
  };
}

function mergeByUrl(devpostItems, unstopItems) {
  const seen = new Set();
  const merged = [];

  const pushIfNew = (item) => {
    const dedupeKey = item.url || `${item.source}-${item.sourceId}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    merged.push(item);
  };

  // Interleave both sources so one source does not dominate top results.
  const maxLength = Math.max(devpostItems.length, unstopItems.length);
  for (let i = 0; i < maxLength; i += 1) {
    if (i < unstopItems.length) pushIfNew(unstopItems[i]);
    if (i < devpostItems.length) pushIfNew(devpostItems[i]);
  }

  return merged;
}

class HackathonService {
  static async getMergedHackathons(query = {}) {
    const timeoutMs = toPositiveInt(query.timeoutMs, DEFAULT_TIMEOUT_MS);
    const unstop = buildUnstopQuery(query);
    const devpost = buildDevpostQuery(query);

    const unstopUrl = `https://unstop.com/api/public/opportunity/search-result?${unstop.queryString}`;
    const devpostUrl = `https://devpost.com/api/hackathons?${devpost.queryString}`;

    const commonHeaders = {
      "accept-language": "en-US,en;q=0.9,en-IN;q=0.8",
      "user-agent": DEFAULT_USER_AGENT,
    };

    const unstopHeaders = {
      ...commonHeaders,
      accept: "application/json, text/plain, */*",
      referer: "https://unstop.com/hackathons?oppstatus=open",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    };

    const devpostHeaders = {
      ...commonHeaders,
      accept: "*/*",
      referer: "https://devpost.com/hackathons",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    };

    if (process.env.UNSTOP_COOKIE) {
      unstopHeaders.cookie = process.env.UNSTOP_COOKIE;
    }

    if (process.env.DEVPOST_COOKIE) {
      devpostHeaders.cookie = process.env.DEVPOST_COOKIE;
    }

    const [unstopResult, devpostResult] = await Promise.allSettled([
      fetchJson(unstopUrl, unstopHeaders, timeoutMs),
      fetchJson(devpostUrl, devpostHeaders, timeoutMs),
    ]);

    const unstopItems =
      unstopResult.status === "fulfilled"
        ? (unstopResult.value?.data?.data || []).map(normalizeUnstopItem)
        : [];

    const devpostItems =
      devpostResult.status === "fulfilled"
        ? (devpostResult.value?.hackathons || []).map(normalizeDevpostItem)
        : [];

    const mergedItems = mergeByUrl(devpostItems, unstopItems);

    const sourceErrors = {
      unstop:
        unstopResult.status === "rejected"
          ? unstopResult.reason?.message || "Unstop request failed"
          : null,
      devpost:
        devpostResult.status === "rejected"
          ? devpostResult.reason?.message || "Devpost request failed"
          : null,
    };

    return {
      page: toPositiveInt(query.page, 1),
      items: mergedItems,
      meta: {
        mergedCount: mergedItems.length,
        unstop: {
          requestedPerPage: unstop.perPage,
          returnedCount: unstopItems.length,
          total: unstopResult.status === "fulfilled" ? unstopResult.value?.data?.total || null : null,
        },
        devpost: {
          requestedPerPage: devpost.perPage,
          returnedCount: devpostItems.length,
          total:
            devpostResult.status === "fulfilled" ? devpostResult.value?.meta?.total_count || null : null,
        },
      },
      sourceErrors,
      sourceUrls: {
        unstop: unstopUrl,
        devpost: devpostUrl,
      },
    };
  }
}

module.exports = HackathonService;
