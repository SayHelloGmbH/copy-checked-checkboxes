const MENU_ID_IMPORTED = "copy-imported-row-checkbox-ids";
const MENU_ID_APPLY = "check-saved-imported-values";
const STORAGE_KEY = "importedValues";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID_IMPORTED,
    title: "Copy checkbox values of rows where Relationship is \"Imported\"",
    contexts: ["all"]
  });
  chrome.contextMenus.create({
    id: MENU_ID_APPLY,
    title: "Tick checkboxes matching the saved \"Imported\" values",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === MENU_ID_APPLY) {
    await applySavedValues(tab.id);
  } else if (info.menuItemId === MENU_ID_IMPORTED) {
    await copyImportedValues(tab.id);
  }
});

// Copies the values of "Imported" rows and saves them for the tick action
async function copyImportedValues(tabId) {
  try {
    // Run in every frame so checkboxes inside iframes are found too
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: collectImportedRowValues
    });

    const values = [];
    let withoutValue = 0;
    for (const r of results) {
      if (!r.result) continue;
      values.push(...r.result.values);
      withoutValue += r.result.withoutValue;
    }

    // Remember the values so they can be ticked in another window
    await chrome.storage.local.set({ [STORAGE_KEY]: values });

    await chrome.scripting.executeScript({
      target: { tabId },
      func: copyAndShow,
      args: [values, withoutValue]
    });
  } catch (err) {
    // Fails on brave:// pages, the Web Store, etc., where extensions can't run
    console.error("Could not read checkboxes on this page:", err);
  }
}

// Runs inside the page: finds rows in WordPress admin list tables whose
// "Relationship" column says "Imported" (but not "Not imported") and returns
// the values of the row checkboxes (e.g. the post ID), whether checked or not.
function collectImportedRowValues() {
  const values = [];
  let withoutValue = 0;
  // Matches "Imported" as a word, unless it is preceded by "Not "
  const imported = /(?<!\bnot\s+)\bimported\b/i;

  for (const table of document.querySelectorAll("table.wp-list-table")) {
    // WordPress gives each cell the class "column-{key}". Find the key from
    // the header whose label is "Relationship", falling back to the key
    // "relationship" itself.
    let columnClass = "column-relationship";
    for (const th of table.querySelectorAll("thead th, thead td")) {
      const headerText = th.textContent.replace(/sort.*$/i, "").trim();
      if (/^relationship$/i.test(headerText)) {
        const cls = [...th.classList].find(
          (c) => c.startsWith("column-") && c !== "column-primary"
        );
        if (cls) columnClass = cls;
        break;
      }
    }

    for (const row of table.querySelectorAll("tbody tr")) {
      const cell = row.querySelector(`td.${CSS.escape(columnClass)}`);
      // textContent (not innerText) so it still works if the column is
      // hidden via Screen Options
      if (!cell || !imported.test(cell.textContent)) continue;

      const box = row.querySelector(
        'th.check-column input[type="checkbox"], input[type="checkbox"]'
      );
      if (!box) continue;
      // Read the attribute: box.value would return "on" when it is missing
      const value = box.getAttribute("value");
      if (value) values.push(value);
      else withoutValue++;
    }
  }
  return { values, withoutValue };
}

// Ticks every checkbox in the tab whose value is in the saved list
async function applySavedValues(tabId) {
  const { [STORAGE_KEY]: values = [] } = await chrome.storage.local.get(STORAGE_KEY);

  try {
    let found = [];
    let ticked = 0;
    if (values.length) {
      const results = await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: tickCheckboxesByValue,
        args: [values]
      });
      for (const r of results) {
        if (!r.result) continue;
        found.push(...r.result.found);
        ticked += r.result.ticked;
      }
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      func: showTickResult,
      args: [values, [...new Set(found)], ticked]
    });
  } catch (err) {
    console.error("Could not tick checkboxes on this page:", err);
  }
}

// Runs inside the page: sets matching checkboxes to checked
function tickCheckboxesByValue(values) {
  const wanted = new Set(values);
  const found = [];
  let ticked = 0;

  for (const box of document.querySelectorAll('input[type="checkbox"]')) {
    const value = box.getAttribute("value");
    if (!value || !wanted.has(value)) continue;
    found.push(value);
    if (box.checked || box.disabled) continue;
    box.checked = true;
    // Let the page (e.g. WordPress bulk-action scripts) know about the change
    box.dispatchEvent(new Event("input", { bubbles: true }));
    box.dispatchEvent(new Event("change", { bubbles: true }));
    ticked++;
  }
  return { found, ticked };
}

// Runs inside the page: reports the result of ticking
function showTickResult(values, found, ticked) {
  if (!values.length) {
    alert('No saved values. First use "Copy checkbox values of rows where Relationship is "Imported"" in the other window.');
    return;
  }
  const foundSet = new Set(found);
  const missing = values.filter((v) => !foundSet.has(v));

  let msg = `${ticked} checkbox(es) ticked.\n${found.length} of ${values.length} saved value(s) found on this page.`;
  if (missing.length) msg += `\n\nNot found on this page:\n${missing.join("\n")}`;
  alert(msg);
}

// Runs inside the page: copies to clipboard and shows the result
async function copyAndShow(values, withoutValue) {
  const text = values.join("\n");

  let copied = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fails if the page isn't focused or isn't served over HTTPS
    copied = false;
    console.error("Could not copy to clipboard:", err);
  }

  let msg = copied
    ? `${values.length} checkbox value(s) from rows marked "Imported" copied to clipboard`
    : `${values.length} checkbox value(s) from rows marked "Imported" found and saved, but copying to the clipboard failed`;
  if (withoutValue) msg += `\n(${withoutValue} matching checkbox(es) had no value)`;
  if (values.length) msg += `:\n\n${text}`;
  alert(msg);
}
