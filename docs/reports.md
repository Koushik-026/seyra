# Lab reports

The project has four separate reports, each following the college's seven-chapter structure: introduction, existing system, proposed system, requirements, implementation, results and conclusion. Most of each report's technical discussion concerns its own subject.

| Report | Main emphasis |
| --- | --- |
| [Java](java/REPORT.md) | Records, collections, allocation, validation, exceptions, concurrency and JDBC |
| [Web Technologies](web/REPORT.md) | HTML/CSS, browser state, Fetch, Node HTTP, room rendering and deployment |
| [DBMS](dbms/REPORT.md) | Relational keys, normalization, SQL, views, transactions, concurrency and lab routines |
| [Software Engineering](se/REPORT.md) | Requirements, UML, data flow, traceability, testing and maintenance |

The Markdown reports and abstracts contain no submission identities. PlantUML sources, SVGs and print-resolution PNGs are in [diagrams](diagrams/README.md). Screenshots in `assets/` contain fictional demonstration records.

## Build editable submission copies

Install Python with `python-docx` and Pillow. Create a local JSON metadata file under the ignored `data/` directory. Its keys are shown in [report-metadata.example.json](report-metadata.example.json); fill it locally. Never commit the completed file.

```sh
python scripts/build-college-reports.py --metadata data/report-team.private.json
```

This creates four Word files under ignored `output/submission/`. The builder retains the reference's Letter page size, Times New Roman, front-matter order, crest, cover colors, double borders and main-page numbering. It expands technical chapters to keep diagrams readable. Signature areas remain unsigned.

Use LibreOffice or Word to export the editable files to PDF, then inspect every page. The preparation workflow used LibreOffice 26.8.2 and the document renderer. After the initial export, `scripts/check-college-reports.py --derive-ranges` obtains chapter page ranges from the PDFs. Rebuild with `--page-ranges output/submission/page-ranges.json`, export again and run the check without that flag. Page ranges must be recalculated if content or pagination changes.

```sh
python scripts/build-college-reports.py --metadata data/report-team.private.json --page-ranges output/submission/page-ranges.json
python scripts/check-college-reports.py --metadata data/report-team.private.json
```

Public documentation is maintained through `scripts/write-report-sources.py`. Generated Word/PDF copies include private college-submission front matter and are deliberately excluded from GitHub. The original reference PDF, execution logs, local databases and renderer tools are also excluded.
