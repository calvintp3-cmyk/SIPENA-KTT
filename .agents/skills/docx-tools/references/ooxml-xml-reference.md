# OOXML XML Reference (Tracked Changes, Comments & Media)

Companion XML pattern reference extracted from `../SKILL.md`. See also [`../ooxml.md`](../ooxml.md).

> **Author attribution note:** Use `"Antigravity"` (or the project/user's explicit author name, e.g. `"Tim Nerwilis"`) for `w:author` unless an existing document review convention requires a specific reviewer name.

## Schema Compliance

- **Element order in `<w:pPr>`**: `<w:pStyle>`, `<w:numPr>`, `<w:spacing>`, `<w:ind>`, `<w:jc>`, and `<w:rPr>` last.
- **Whitespace**: Add `xml:space="preserve"` on `<w:t>` when text begins or ends with whitespace.
- **RSIDs**: Must be 8-digit uppercase hex (e.g., `00AB1234`).

## Tracked Changes

### Insertion & Deletion

```xml
<w:ins w:id="1" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
  <w:r><w:t>inserted text</w:t></w:r>
</w:ins>

<w:del w:id="2" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
```

Inside `<w:del>`, use `<w:delText>` instead of `<w:t>`, and `<w:delInstrText>` instead of `<w:instrText>`.

### Minimal Edits

Only wrap changed spans inside `<w:del>` / `<w:ins>` (never wrap the entire untouched paragraph):

```xml
<w:r><w:t xml:space="preserve">The term is </w:t></w:r>
<w:del w:id="1" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t xml:space="preserve"> days.</w:t></w:r>
```

### Deleting Entire Paragraphs or List Items

Include `<w:del/>` inside `<w:pPr><w:rPr>` so accepting changes merges cleanly instead of leaving an empty paragraph/bullet:

```xml
<w:p>
  <w:pPr>
    <w:numPr>...</w:numPr>
    <w:rPr>
      <w:del w:id="1" w:author="Antigravity" w:date="2026-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
    <w:r><w:delText>Entire paragraph content being deleted...</w:delText></w:r>
  </w:del>
</w:p>
```

### Rejecting or Restoring Another Author's Changes

```xml
<!-- Reject another author's insertion by nesting w:del inside their w:ins -->
<w:ins w:author="Reviewer" w:id="5">
  <w:del w:author="Antigravity" w:id="10">
    <w:r><w:delText>their inserted text</w:delText></w:r>
  </w:del>
</w:ins>

<!-- Restore another author's deletion by inserting immediately after it -->
<w:del w:author="Reviewer" w:id="5">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
<w:ins w:author="Antigravity" w:id="10">
  <w:r><w:t>deleted text</w:t></w:r>
</w:ins>
```

## Comments

After running `python scripts/comment.py unpacked/ 0 "Comment text"`, place `<w:commentRangeStart>` and `<w:commentRangeEnd>` directly under `<w:p>` (as siblings of `<w:r>`, never inside `<w:r>`):

```xml
<w:commentRangeStart w:id="0"/>
<w:del w:id="1" w:author="Antigravity" w:date="2026-01-01T00:00:00Z">
  <w:r><w:delText>deleted</w:delText></w:r>
</w:del>
<w:r><w:t xml:space="preserve"> more text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
```

For threaded replies (`--parent 0`), nest the child `<w:commentRangeStart w:id="1"/>...<w:commentRangeEnd w:id="1"/>` inside parent comment `0`'s markers and emit both `<w:commentReference>` runs after `<w:commentRangeEnd w:id="0"/>`.

## Embedded Images

1. Copy image into `unpacked/word/media/image1.png`.
2. Add relationship entry in `unpacked/word/_rels/document.xml.rels`:
   ```xml
   <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
   ```
3. Ensure `<Default Extension="png" ContentType="image/png"/>` exists in `[Content_Types].xml`.
4. Embed `<w:drawing><wp:inline><wp:extent cx="914400" cy="914400"/>...</wp:inline></w:drawing>` (`914400` EMU = 1 inch) inside `<w:r>`.

