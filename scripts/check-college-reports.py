"""Check PDF content and pagination; visual page review is still required."""
import argparse,json,re
from pathlib import Path
import pdfplumber
from docx import Document
ROOT=Path(__file__).resolve().parents[1]
KEYS=['java','web','dbms','se']
CHAPTERS=['INTRODUCTION','EXISTING SYSTEM','PROPOSED SYSTEM','HARDWARE AND SOFTWARE REQUIREMENTS','IMPLEMENTATION','RESULTS','CONCLUSION']

def inspect(key,folder,metadata,derive):
    path=folder/f'seyra-{key}-report.pdf'
    with pdfplumber.open(path) as pdf:
        texts=[p.extract_text() or '' for p in pdf.pages]
        starts=[]
        for title in CHAPTERS:
            hits=[i for i,t in enumerate(texts) if title in t.splitlines()]
            assert len(hits)==1,(key,title,hits)
            starts.append(hits[0])
        assert starts==sorted(starts) and starts[0]==5,(key,'Front matter pagination',starts)
        ranges={}
        for n,start in enumerate(starts,1):
            end=starts[n] if n<7 else len(texts)
            first,last=start-4,end-5
            ranges[str(n)]=str(first) if first==last else f'{first}-{last}'
        for n,p in enumerate(pdf.pages):
            assert abs(p.width-612)<1 and abs(p.height-792)<1,(key,n,'page size')
            assert texts[n].strip(),(key,n,'blank page')
            for char in p.chars:
                if char['text'].strip():
                    assert char['x0']>=34 and char['x1']<=579,(key,n+1,'horizontal overflow',char)
                    assert char['top']>=34 and char['bottom']<=767,(key,n+1,'vertical overflow',char)
            if n>=5:
                assert texts[n].splitlines()[-1]==str(n-4),(key,n+1,'page footer')
        alltext='\n'.join(texts)
        for person in metadata['team']:
            for page in [0,1,2]:assert person['name'] in texts[page] and person['roll'] in texts[page],(key,page+1,person['name'])
        for value in [metadata['academic_year'],metadata['year_semester'],metadata['guides'][key],metadata['hod']]:assert value in alltext,(key,value)
        assert metadata['principal'] in texts[2]
        for forbidden in ['KOGURU','24D41A66C0','AI College Assistant Chatbot','2025-2026','II-SEMESTER','TODO','TBD']:
            assert forbidden not in alltext,(key,'old or placeholder content',forbidden)
        assert '3,068' in alltext and '1,000' in alltext
        if not derive:
            # Contents rows can wrap; compare page ranges in row order, not a text line assumption.
            toc=texts[4]
            for value in ranges.values():assert re.search(r'(?<!\d)'+re.escape(value)+r'(?!\d)',toc),(key,'TOC range',value)
        doc=Document(folder/f'seyra-{key}-report.docx')
        assert len(doc.sections)==3 and len(doc.inline_shapes)>=4
        return ranges,{'pages':len(texts),'figures_and_crests':len(doc.inline_shapes),'ranges':ranges,'checked':'content, identities, Letter geometry, text bounds, numbering and contents'}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--metadata',type=Path,required=True);ap.add_argument('--folder',type=Path,default=ROOT/'output/submission');ap.add_argument('--derive-ranges',action='store_true')
    args=ap.parse_args();metadata=json.loads(args.metadata.read_text(encoding='utf-8'));ranges={};report={}
    for key in KEYS:ranges[key],report[key]=inspect(key,args.folder,metadata,args.derive_ranges)
    if args.derive_ranges:(args.folder/'page-ranges.json').write_text(json.dumps(ranges,indent=2),encoding='utf-8')
    (args.folder/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
