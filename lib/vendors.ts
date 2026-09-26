// Hand-written words for the connector pages. Everything structural on those
// pages (roles, fields, config keys, credentials, cost) comes from the
// manifests; these are the one-line introductions the manifests don't carry.
// Keep each to a sentence or two, factual, in the docs voice.

export type Vendor = {
  key: string; // the id's first segment: "apollo" in apollo/search
  name: string;
  /** The word in front of the operation in a page title: "AI filter", "CSV source". */
  short?: string;
  url?: string; // the vendor's own site, when there is one
  blurb: string;
  // Where the group sits on the catalog page.
  kind: "vendor" | "file" | "step";
};

export const VENDORS: Vendor[] = [
  {
    key: "apollo",
    name: "Apollo",
    url: "https://www.apollo.io",
    kind: "vendor",
    blurb:
      "B2B contact database. Search finds people at $0 with names and titles but no email; enrich reveals the rest per record.",
  },
  {
    key: "attio",
    name: "Attio",
    url: "https://attio.com",
    kind: "vendor",
    blurb: "CRM. Records are asserted into an object and matched on email, so a re-run updates rather than duplicates.",
  },
  {
    key: "harvest",
    name: "Harvest API",
    url: "https://harvestapi.io",
    kind: "vendor",
    blurb: "LinkedIn profile data by URL: headline, about, role history, recent posts.",
  },
  {
    key: "hubspot",
    name: "HubSpot",
    url: "https://www.hubspot.com",
    kind: "vendor",
    blurb: "CRM. Contacts come out through the CRM v3 Search API.",
  },
  {
    key: "instantly",
    name: "Instantly",
    url: "https://instantly.ai",
    kind: "vendor",
    blurb: "Cold email sending. Records become leads in a campaign, with merge variables from the ledger.",
  },
  {
    key: "csv",
    short: "CSV",
    name: "CSV files",
    kind: "file",
    blurb: "A file on disk as the start or the end of a pipeline. No keys, no spend.",
  },
  {
    key: "http",
    short: "HTTP",
    name: "HTTP",
    kind: "file",
    blurb: "Any URL. Fetch a page or a JSON endpoint per record, or post each record to an endpoint you run.",
  },
  {
    key: "ai",
    short: "AI",
    name: "AI steps",
    kind: "step",
    blurb:
      "A model reads each record and answers the step's declared fields. Needs ANTHROPIC_API_KEY; the receipt shows the spend per step.",
  },
  {
    key: "agent",
    short: "Agent",
    name: "Agent steps",
    kind: "step",
    blurb:
      "The same three roles as the AI steps, answered by an agent you run instead of a model the runner calls. Records wait in the ledger for gtme answer.",
  },
  {
    key: "human",
    short: "Human",
    name: "Human steps",
    kind: "step",
    blurb: "A person answers, at the terminal as the run walks the records or later with gtme answer.",
  },
  {
    key: "text",
    short: "Text",
    name: "Text steps",
    kind: "step",
    blurb: "A template rendered per record, no model call, $0.",
  },
  {
    key: "demo",
    name: "Demo",
    kind: "step",
    blurb: "A keyless, pretend-priced enrichment for practicing runs and receipts. It calls no one and spends nothing.",
  },
];

export function vendorFor(key: string): Vendor {
  return (
    VENDORS.find((v) => v.key === key) ?? {
      key,
      name: key,
      kind: "vendor",
      blurb: "",
    }
  );
}

// One line per built-in connector. Registry entries bring their own
// description in index.json, so nothing here is needed for them.
export const BLURBS: Record<string, string> = {
  "agent/compose":
    "An agent writes the step's declared fields for each record, shown a template over the record's fields.",
  "agent/filter": "An agent decides pass or fail for each record, and the reason lands in the ledger.",
  "agent/review": "An agent reviews each record and answers the step's declared fields.",
  "ai/compose":
    "A model writes the step's declared fields from a template over the record's fields, in batches, with fetched fields fenced as data.",
  "ai/filter":
    "A model keeps or drops each record against a template. The verdict and its reason are cached, so a re-run spends nothing.",
  "ai/review": "A model reviews each record and answers the step's declared fields.",
  "apollo/enrich":
    "Reveals a person that apollo/search found: email, LinkedIn URL, location, and company fields. Paid per record and cached for 30 days.",
  "apollo/search":
    "Finds people by title, seniority, location, company size, or free text. Apollo's masked search returns names and titles at $0 and no email; apollo/enrich reveals the rest.",
  "attio/assert":
    "Asserts each record into an Attio object, matched on email, with the step's variables written as attributes.",
  "csv/deliver": "Appends each record to a CSV file, one column per step variable. The file gets a header on first write.",
  "csv/source":
    "Reads people or companies from a CSV file. The header row names the fields; columns maps the rest onto canonical names.",
  "demo/enrich":
    "Scores each record with a pretend price so a first run has a receipt with numbers in it. No key, no network, no spend.",
  "harvest/profile":
    "Pulls a LinkedIn profile by URL: headline, about, role history, and recent posts. Paid per lookup and cached for 30 days.",
  "http/deliver":
    "Posts each record to a URL you choose, with the body templated from the step's variables. The endpoint is yours.",
  "http/enrich":
    "Fetches a URL templated from the record's fields and stores the page as markdown, or extracts fields from a JSON response.",
  "human/compose": "A person writes the step's declared fields for each record, at the terminal or later with gtme answer.",
  "human/filter": "A person decides pass or fail for each record, at the terminal or later with gtme answer.",
  "human/review": "A person reviews each record and answers the step's declared fields.",
  "instantly/add-to-campaign":
    "Adds each record as a lead to an Instantly campaign, by name or id, with merge variables from the ledger. Preflight checks the campaign before an armed run, and idempotency keeps a re-run from adding anyone twice.",
  "text/compose": "Renders one template per record into one field. No model, no key, $0.",
};
