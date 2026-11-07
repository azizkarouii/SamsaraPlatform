package com.samsara.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Writes a one-sheet Excel file (.xlsx): a zip of a few XML parts. Enough for a table of text and amounts,
 * without a spreadsheet library. Numbers stay numbers in Excel, so totals and filters work.
 */
public final class XlsxWriter {

    private XlsxWriter() {
    }

    /** @param rows cells are text, numbers, or null; the first row is the header, in bold */
    public static byte[] write(String sheetName, List<List<Object>> rows, boolean rightToLeft) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            put(zip, "[Content_Types].xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                    <Default Extension="xml" ContentType="application/xml"/>
                    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                    <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                    <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                    </Types>""");
            put(zip, "_rels/.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                    </Relationships>""");
            put(zip, "xl/workbook.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                    <sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets>
                    </workbook>""".formatted(escape(sheetName.length() > 31 ? sheetName.substring(0, 31) : sheetName)));
            put(zip, "xl/_rels/workbook.xml.rels", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                    </Relationships>""");
            // Style 1: bold header; style 2: amounts with 2 decimals
            put(zip, "xl/styles.xml", """
                    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                    <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                    <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
                    <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
                    <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
                    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
                    <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>
                    </styleSheet>""");
            put(zip, "xl/worksheets/sheet1.xml", sheet(rows, rightToLeft));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return bytes.toByteArray();
    }

    private static String sheet(List<List<Object>> rows, boolean rightToLeft) {
        StringBuilder xml = new StringBuilder("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                """);
        xml.append("<sheetViews><sheetView workbookViewId=\"0\"").append(rightToLeft ? " rightToLeft=\"1\"" : "").append("/></sheetViews>");
        xml.append("<cols><col min=\"1\" max=\"2\" width=\"26\" customWidth=\"1\"/><col min=\"3\" max=\"12\" width=\"15\" customWidth=\"1\"/></cols>");
        xml.append("<sheetData>");
        for (int r = 0; r < rows.size(); r++) {
            xml.append("<row r=\"").append(r + 1).append("\">");
            List<Object> cells = rows.get(r);
            for (int c = 0; c < cells.size(); c++) {
                Object value = cells.get(c);
                String ref = column(c) + (r + 1);
                if (value == null) {
                    continue;
                }
                if (value instanceof Number number && r > 0) {
                    String text = number instanceof BigDecimal decimal ? decimal.toPlainString() : number.toString();
                    xml.append("<c r=\"").append(ref).append("\" s=\"2\"><v>").append(text).append("</v></c>");
                } else {
                    xml.append("<c r=\"").append(ref).append("\" t=\"inlineStr\"").append(r == 0 ? " s=\"1\"" : "")
                            .append("><is><t xml:space=\"preserve\">").append(escape(String.valueOf(value))).append("</t></is></c>");
                }
            }
            xml.append("</row>");
        }
        return xml.append("</sheetData></worksheet>").toString();
    }

    private static String column(int index) {
        StringBuilder name = new StringBuilder();
        for (int i = index + 1; i > 0; i = (i - 1) / 26) {
            name.insert(0, (char) ('A' + (i - 1) % 26));
        }
        return name.toString();
    }

    private static String escape(String text) {
        StringBuilder out = new StringBuilder(text.length());
        for (char ch : text.toCharArray()) {
            switch (ch) {
                case '&' -> out.append("&amp;");
                case '<' -> out.append("&lt;");
                case '>' -> out.append("&gt;");
                case '"' -> out.append("&quot;");
                default -> {
                    // Control characters are not allowed in XML
                    if (ch >= 0x20 || ch == '\t' || ch == '\n' || ch == '\r') out.append(ch);
                }
            }
        }
        return out.toString();
    }

    private static void put(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
