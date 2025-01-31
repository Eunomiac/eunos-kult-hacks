
/**
 * Wraps GM Move phrases in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with GM Move phrases wrapped in spans
 * @example
 * wrapGMMoves("When the GM makes a Move, players must respond")
 * // Returns: "When the <span class='gm-move-text'>GM makes a Move</span>, players must respond"
 */
function wrapGMMoves(html: string): string {
  // First remove any existing gm-move-text spans
  html = html.replace(/<span class="gm-move-text">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  const gmMovePattern = /(?:the\s+)?GM(?:\s+[\w\d]+){0,2}\s+(?:\d+ Hold|Move[s]?)(?!\s+[\w\d]+\s+(?:Hold|Move[s]?))/gi;
  return html.replace(gmMovePattern, match => {
    console.log(html);
    console.log(match);
    console.log(`<span class="gm-move-text">${match}</span>`);
    return `<span class="gm-move-text">${match}</span>`;
  });
}

/**
 * Wraps game mechanical terms in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with key words wrapped in spans
 * @example
 * wrapKeyWords("Make a roll +Violence to attack")
 * // Returns: "Make a <span class='key-word'>roll +Violence</span> to attack"
 */
function wrapKeyWords(html: string): string {
  // First remove any existing key-word spans
  html = html.replace(/<span class="key-word">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  // const keyWordPattern = /[Rr]oll \+[0-9a-zA-Z]+|Attribute|Reflexes|Fortitude|Willpower|Coolness|Violence|Charisma|Reason|Perception|Intuition|Soul|(?:-|&minus;|–|\+|[\d/\s]+)? ?(?:Stability|Harm|Relations?h?i?p?s?) ?(?:-|&minus;|–|\+|[\d/\s]+)?|(Critical |Serious )?Wounds?/g;
  const keyWordPattern = /<p><em>Suggested personal drives:<\/em><\/p>/g;
  return html.replace(keyWordPattern, match =>
    `<h3>Suggested Personal Drives:</h3>`
  );
}

/**
 * Wraps trigger words in HTML span tags
 * @param html - The HTML string to process
 * @returns The processed HTML with trigger words wrapped in spans
 * @example
 * wrapTriggers("When the GM makes a Move, players must respond")
 * // Returns: "When the <span class='trigger-words'><em>GM makes a Move</em></span>, players must respond"
 */
function wrapTriggers(html: string): string {
  // First remove any existing trigger spans
  html = html.replace(/<span class="trigger-words">|<\/span>/g, "");

  // Replace any &nbsp; with a space
  html = html.replace(/&nbsp;/g, " ");

  const triggerPattern = /<em>(?:\s*\b\S+\b[,\s.]*){4,}<\/em>/gi;
  return html.replace(triggerPattern, match =>
    `<span class="trigger-words"><em>${match}</em></span>`
  );
}

/**
 * Recursively processes Foundry Documents, applying wrapGMMoves to HTML strings in system data
 * @param obj - Single Document or array of Documents to process
 * @returns Promise that resolves when all updates are complete
 */
export default async function processHTMLStrings(obj: Document|Document[]): Promise<void> {
  const documents = (Array.isArray(obj) ? obj : [obj]) as Array<Document & Maybe<{name: string,system: Record<string, unknown>}>>;

  const updates = documents.map((doc) => {
    const updateData: Record<string, unknown> = {};

    function processObject(obj: Record<string, unknown>, path: string[] = []): void {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (typeof value === 'string' && /<\/[^>]+>/g.test(value)) {
          // Process HTML string and add to updates if changed
          const processed = wrapTriggers(wrapKeyWords(wrapGMMoves(value)));
          if (processed !== value) {
            updateData[`system.${currentPath.join('.')}`] = processed;
          }
        } else if (value && typeof value === 'object') {
          // Recursively process nested objects
          processObject(value as Record<string, unknown>, currentPath);
        }
      }
    }

    // Only process the system data
    if (doc.system) {
      processObject(doc.system);
    }

    return updateData;
  });

  // Only update documents that have changes
  const updatePromises = documents.map((doc, index) => {
    const updateData = updates[index];
    if (
      !updateData ||
      !("update" in doc) ||
      typeof doc.update !== "function" ||
      Object.keys(updateData).length === 0
    ) {
      return Promise.resolve();
    }

    try {
      // intentionally unsound type assertion
      return (doc.update as (updateData: Record<string, unknown>) => Promise<void>)(updateData);
    } catch (error) {
      console.error(`Error updating document ${doc.name}:`, error);
      return Promise.resolve();
    }
  });

  await Promise.all(updatePromises);
}
