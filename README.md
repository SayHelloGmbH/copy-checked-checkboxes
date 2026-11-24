# WordPress Imported Checkbox Values

A browser extension for Chrome, Brave and other Chromium browsers. It adds two items to the right-click menu:

1. **Copy checkbox values of rows where Relationship is "Imported"**: finds every row in a WordPress admin list table (such as the Posts screen) whose **Relationship** column says "Imported", then copies the values of those rows' checkboxes. On a normal posts table, these values are the post IDs.
2. **Tick checkboxes matching the saved "Imported" values**: ticks every checkbox on the current page whose value is in the list you copied, for example the same posts on another site or in another window.

## Install

1. Open `chrome://extensions` (or `brave://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.

After you change any file, click the reload icon on the extension's card.

## Use

### 1. Copy the values

1. Open the WordPress admin list table that has the **Relationship** column.
2. Right-click anywhere on the page and choose **Copy checkbox values of rows where Relationship is "Imported"**.
3. An alert shows how many values were found and lists them.

The values are copied to the clipboard and also saved in the extension, so step 2 works even if you copy something else in between.

Which rows are included:

- A row is included if its Relationship cell contains the word "Imported", in upper or lower case.
- A row is skipped if the cell says "Not imported".
- The checkbox's tick state doesn't matter.
- It works even if the Relationship column is hidden under **Screen Options**.
- Only rows on the current page of the table are read. To include more, raise **Number of items per page** in Screen Options, or repeat the steps on each page.

Each copy replaces the previously saved list.

### 2. Tick the matching checkboxes

1. In the second window, open the page with the checkboxes you want to tick.
2. Right-click and choose **Tick checkboxes matching the saved "Imported" values**.
3. An alert shows how many checkboxes were ticked and lists any saved values that weren't found on that page.

Boxes that are already ticked, and disabled boxes, are left as they are. You can then choose a bulk action as usual.

## Limitations

- Copying to the clipboard only works on HTTPS pages (or `localhost`). On a plain `http://` page, the alert says the copy failed. The values are still saved and listed in the alert, so the tick action still works.
- Extensions can't run on browser pages such as `chrome://` or `brave://`, or on the Chrome Web Store.

## Files

- `manifest.json`: extension settings and permissions.
- `background.js`: the menu items and the code that runs on the page.
