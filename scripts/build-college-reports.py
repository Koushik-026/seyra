"""College-format DOCX reports. Identities are read only from ignored metadata."""
import argparse,json,re
from pathlib import Path
from PIL import Image
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH as A
from docx.enum.section import WD_SECTION_START
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
ROOT=Path(__file__).resolve().parents[1]
TITLES={'java':'Java Programming','web':'Web Technologies','dbms':'Database Management Systems','se':'Software Engineering'}
CHAPTERS=['INTRODUCTION','EXISTING SYSTEM','PROPOSED SYSTEM','HARDWARE AND SOFTWARE REQUIREMENTS','IMPLEMENTATION','RESULTS','CONCLUSION']

def el(tag,**attrs):
    e=OxmlElement('w:'+tag)
    for k,v in attrs.items():e.set(qn('w:'+k),str(v))
    return e

def section(s,border=True,top=88):
    s.page_width=Inches(8.5);s.page_height=Inches(11)
    s.top_margin=Pt(top);s.bottom_margin=Pt(52);s.left_margin=Pt(50);s.right_margin=Pt(50)
    s.header_distance=Pt(30);s.footer_distance=Pt(31)
    old=s._sectPr.find(qn('w:pgBorders'))
    if old is not None:s._sectPr.remove(old)
    if border:
        b=el('pgBorders',offsetFrom='page',display='allPages')
        for side,space in [('top',28),('left',30),('bottom',28),('right',30)]:b.append(el(side,val='double',sz=8,space=space,color='000000'))
        s._sectPr.insert_element_before(b,'w:lnNumType','w:pgNumType','w:cols','w:docGrid')

def run(p,text,size=12,bold=False,color='000000',font='Times New Roman'):
    r=p.add_run(text);r.font.name=font;r.font.size=Pt(size);r.bold=bold;r.font.color.rgb=RGBColor.from_string(color)
    r._element.get_or_add_rPr().append(el('rFonts',ascii=font,hAnsi=font,eastAsia=font,cs=font))
    return r

def line(d,text='',size=12,bold=False,color='000000',before=0,after=6,align=A.CENTER):
    p=d.add_paragraph();p.alignment=align;f=p.paragraph_format
    f.space_before=Pt(before);f.space_after=Pt(after);f.line_spacing=1.05
    run(p,text,size,bold,color);return p

def inline(p,text,size=12):
    for bit in re.split(r'(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))',text):
        if not bit:continue
        if bit.startswith('`'):run(p,bit[1:-1],size)
        elif bit.startswith('**'):run(p,bit[2:-2],size,True)
        elif bit.startswith('['):
            m=re.fullmatch(r'\[([^\]]+)\]\(([^)]+)\)',bit)
            run(p,m[1]+(' ('+m[2]+')' if m[2].startswith('http') else ''),size)
        else:run(p,bit,size)

def body(d,text):
    p=d.add_paragraph();p.alignment=A.JUSTIFY;f=p.paragraph_format
    f.left_indent=Pt(35);f.right_indent=Pt(30);f.first_line_indent=Pt(26);f.line_spacing=1.32;f.space_after=Pt(8)
    inline(p,text);return p

def heading(d,text,sub=False):
    p=line(d,text,13 if sub else 16,True,after=8 if sub else 18,align=A.LEFT if sub else A.CENTER)
    p.style='Heading 2' if sub else 'Heading 1';f=p.paragraph_format;f.keep_with_next=True
    if sub:f.left_indent=Pt(35);f.right_indent=Pt(30);f.space_before=Pt(12)
    return p

def table(d,rows,widths=None):
    widths=widths or ([95,160,257] if len(rows[0])==3 else [195,317])
    if len(widths)!=len(rows[0]):widths=[512/len(rows[0])]*len(rows[0])
    t=d.add_table(rows=0,cols=len(rows[0]));t.autofit=False
    for c,w in zip(t.columns,widths):c.width=Pt(w)
    b=el('tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:b.append(el(edge,val='single',sz=6,color='000000'))
    t._tbl.tblPr.append(b)
    for i,values in enumerate(rows):
        cells=t.add_row().cells;tr=t.rows[-1]._tr.get_or_add_trPr();tr.append(el('cantSplit'))
        if i==0:tr.append(el('tblHeader'))
        for j,(c,text) in enumerate(zip(cells,values)):
            c.width=Pt(widths[j]);mar=el('tcMar')
            for side in ['top','left','bottom','right']:mar.append(el(side,w=75,type='dxa'))
            c._tc.get_or_add_tcPr().append(mar)
            p=c.paragraphs[0];p.paragraph_format.line_spacing=1.1;p.paragraph_format.space_after=Pt(2)
            if i==0:p.alignment=A.CENTER
            inline(p,text,10.5)
            if i==0:
                for r in p.runs:r.bold=True
    d.add_paragraph().paragraph_format.space_after=Pt(3)
    return t

def team(d,m,after=4):
    for person in m['team']:line(d,f"{person['name']} ({person['roll']})",11.5,True,after=after)

def crest(d,width):
    p=d.add_paragraph();p.alignment=A.CENTER;p.paragraph_format.space_after=Pt(6)
    p.add_run().add_picture(str(ROOT/'docs/assets/college-crest.png'),width=Pt(width))

def front(d,m,key,ranges):
    section(d.sections[0],top=48)
    for text,size,bold,color,after in [
        ('A PROJECT REPORT',16,True,'C00000',6),('ON',12,True,'000000',7),
        ('SEYRA',18,True,'C00000',2),('EXAM HALL SEATING PLANNER',15,True,'C00000',7),
        (TITLES[key],12,True,'000000',10),
        ('A Course Project report submitted in partial fulfillment of the',11,False,'0000AA',2),
        ('academic requirements for the award of the degree of',11,False,'0000AA',8),
        (m['degree'],14,True,'C00000',3),('IN',11,True,'000000',3),
        ('CSE ARTIFICIAL INTELLIGENCE AND',12,True,'C00000',2),('MACHINE LEARNING',12,True,'C00000',9),
        ('Submitted by',11,False,'0000AA',5)]:line(d,text,size,bold,color,after=after)
    team(d,m)
    line(d,m['year_semester']+'  |  '+m['section'],11,after=9)
    line(d,'Under the esteemed guidance of',11,color='0000AA',after=4)
    line(d,m['guides'][key],12,True,after=7);crest(d,79)
    for text,size,bold,after in [('DEPARTMENT OF',11,True,2),(m['department'],11,True,8),(m['institution'],12,True,3),('(An Autonomous Institute)',10,False,3),('('+m['affiliation']+')',9.5,False,3),(m['address'],10,False,5),(m['academic_year'],12,True,0)]:line(d,text,size,bold,after=after)
    d.add_page_break()
    line(d,m['institution'],15,True,color='C00000',after=7)
    line(d,'(An Autonomous Institute)',11,after=5)
    line(d,'('+m['affiliation']+')',10,after=12)
    line(d,'DEPARTMENT OF',12,True,color='0000AA',after=3)
    line(d,m['department'],12,True,color='0000AA',after=12);crest(d,95)
    line(d,'CERTIFICATE',16,True,after=20)
    names=', '.join(f"{p['name']} ({p['roll']})" for p in m['team'])
    body(d,f"This is to certify that the project report entitled ‘Seyra Exam Hall Seating Planner’ is submitted by {names} in partial fulfillment of the academic requirements for the award of the degree of Bachelor of Technology in Artificial Intelligence and Machine Learning at Sri Indu College of Engineering and Technology for the academic year {m['academic_year']}. This report records the project work for {TITLES[key]} in {m['year_semester']} of the B.Tech course.")
    line(d,'',after=32)
    t=d.add_table(rows=2,cols=2)
    for i,values in enumerate([(m['guides'][key],m['hod']),('(Internal Guide)','(Head of the Department)')]):
        for c,text in zip(t.rows[i].cells,values):p=c.paragraphs[0];p.alignment=A.CENTER;run(p,text,11,i==0)
    # No faculty signature is fabricated or copied from the reference.
    s=d.add_section(WD_SECTION_START.NEW_PAGE);section(s,False);s.footer.is_linked_to_previous=False
    heading(d,'ACKNOWLEDGMENT')
    for text in [
        f"We thank our Principal, {m['principal']}, for the academic facilities and laboratory environment available for this project.",
        f"We express our gratitude to {m['hod']}, Head of the Department of Artificial Intelligence and Machine Learning, for supporting our course project work.",
        f"We thank our internal guide, {m['guides'][key]}, for the opportunity to present this work in {TITLES[key]}.",
        'We also thank the teaching and non-teaching staff of the department for their support. Preparing this project helped us connect the concepts studied in the laboratory with a complete working application.'
    ]:body(d,text)
    line(d,'',after=22);team(d,m,6)
    d.add_page_break();heading(d,'ABSTRACT')
    for p in (ROOT/'docs'/key/'ABSTRACT.md').read_text(encoding='utf-8').strip().split('\n\n'):body(d,p)
    d.add_page_break();heading(d,'TABLE OF CONTENTS')
    table(d,[['S.NO','TOPIC','PAGE NO']]+[[str(i),t.title(),ranges.get(str(i),'')] for i,t in enumerate(CHAPTERS,1)],[55,355,102])
    line(d,'Subject: '+TITLES[key],12,before=14)
    line(d,'Project: Seyra Exam Hall Seating Planner',12)
    s=d.add_section(WD_SECTION_START.NEW_PAGE);section(s);s.footer.is_linked_to_previous=False;s._sectPr.insert_element_before(el('pgNumType',start=1),'w:cols','w:docGrid')
    p=s.footer.paragraphs[0];p.alignment=A.CENTER;p._p.append(el('fldSimple',instr='PAGE'))

def markdown(d,key):
    lines=(ROOT/'docs'/key/'REPORT.md').read_text(encoding='utf-8').splitlines()
    i=next(i for i,l in enumerate(lines) if l.startswith('## 1 '));chapter=0;figure=0;newpage=True
    while i<len(lines):
        text=lines[i].strip()
        if not text:i+=1;continue
        if text.startswith('## '):
            if not newpage:d.add_page_break()
            chapter=int(text[3]);figure=0;heading(d,text[5:]);newpage=False;i+=1
        elif text.startswith('### '):heading(d,text[4:],True);newpage=False;i+=1
        elif text.startswith('!['):
            m=re.match(r'!\[(.*?)\]\((.*?)\)',text);path=(ROOT/'docs'/key/m[2]).resolve()
            figure+=1
            p=line(d,'RESULT SCREEN' if chapter==6 else 'DESIGN DIAGRAM',13,True,before=10,after=14)
            p.paragraph_format.keep_with_next=True
            with Image.open(path) as im:w,h=im.size
            maxw,maxh=(490,490) if chapter==6 else (510,575);scale=min(maxw/w,maxh/h)
            p=d.add_paragraph();p.alignment=A.CENTER;p.add_run().add_picture(str(path),width=Pt(w*scale),height=Pt(h*scale))
            p.paragraph_format.keep_with_next=True
            line(d,f'Figure {chapter}.{figure}  {m[1]}',11,before=10,after=12)
            newpage=False;i+=1
        elif text.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                cells=[x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?',c) for c in cells):rows.append(cells)
                i+=1
            widths=None
            if key=='se' and chapter==5:widths=[38,190,284] if rows[0][0]=='ID' else [85,190,237]
            elif key=='dbms' and chapter==5:widths=[77,227,208]
            table(d,rows,widths);newpage=False
        elif text.startswith('```'):
            i+=1;code=[]
            while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
            for row in code:
                p=d.add_paragraph();f=p.paragraph_format;f.left_indent=Pt(8);f.line_spacing=1;f.space_after=Pt(2);f.keep_with_next=True
                run(p,row,9.5,font='Consolas')
            if code:d.paragraphs[-1].paragraph_format.keep_with_next=False
            i+=1;newpage=False
        elif re.match(r'^\d+\. ',text):
            p=d.add_paragraph();p.alignment=A.LEFT;f=p.paragraph_format
            f.left_indent=Pt(35);f.right_indent=Pt(30);f.space_after=Pt(8);f.line_spacing=1.15
            inline(p,text,11);i+=1;newpage=False
        else:
            parts=[text];i+=1
            while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','|','```','![')):parts.append(lines[i].strip());i+=1
            body(d,' '.join(parts));newpage=False

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--metadata',type=Path,required=True);ap.add_argument('--output',type=Path,default=ROOT/'output/submission');ap.add_argument('--page-ranges',type=Path);ap.add_argument('--subject',choices=TITLES)
    args=ap.parse_args();m=json.loads(args.metadata.read_text(encoding='utf-8'));ranges=json.loads(args.page_ranges.read_text(encoding='utf-8')) if args.page_ranges else {}
    args.output.mkdir(parents=True,exist_ok=True)
    for key in ([args.subject] if args.subject else TITLES):
        d=Document();s=d.styles['Normal'];s.font.name='Times New Roman';s.font.size=Pt(12);s.paragraph_format.widow_control=True
        for name,size in [('Title',18),('Heading 1',16),('Heading 2',13)]:s=d.styles[name];s.font.name='Times New Roman';s.font.size=Pt(size);s.font.bold=True;s.font.color.rgb=RGBColor(0,0,0)
        d.core_properties.title='Seyra Exam Hall Seating Planner '+TITLES[key]+' Report';d.core_properties.subject=TITLES[key];d.core_properties.author='Project submission'
        front(d,m,key,ranges.get(key,{}));markdown(d,key)
        path=args.output/f'seyra-{key}-report.docx';d.save(path);print(path)
if __name__=='__main__':main()
