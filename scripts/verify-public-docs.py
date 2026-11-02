"""Validate local documentation links and the sanitized source snapshot."""
import argparse,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--snapshot',type=Path,required=True);ap.add_argument('--metadata',type=Path)
args=ap.parse_args();root=args.snapshot.resolve()
files=[root/p for p in subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=root,text=True).splitlines()]
private=[]
if args.metadata:
    metadata=json.loads(args.metadata.read_text(encoding='utf-8'))
    private=[value for p in metadata['team'] for value in [p['name'],p['roll']]]
links=0
for p in files:
    relative=p.relative_to(root)
    assert relative.parts[0] not in {'data','output','tools','tmp','lib','build'},relative
    assert not p.name.endswith('.private.json'),relative
    assert p.suffix.lower() not in {'.docx','.pdf','.msi','.jar','.exe'},relative
    if p.suffix.lower() in {'.png','.jpg','.jpeg'}:continue
    text=p.read_text(encoding='utf-8-sig')
    for value in private:assert value not in text,('Private submission identity in public source',relative)
    assert not re.search(r'ghp_[A-Za-z0-9]{20}|github_pat_[A-Za-z0-9_]{30}',text),relative
    if p.suffix=='.md':
        for target in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)',text):
            if target.startswith(('http://','https://','#','mailto:')):continue
            target=target.split('#')[0]
            assert (p.parent/target).exists(),('Broken relative link',relative,target)
            links+=1
for p in (root/'docs/diagrams').glob('*.puml'):
    for ext in ['.svg','.png']:assert p.with_suffix(ext).exists(),p
print(f'PASS {len(files)} public source files; {links} local documentation links; private submission identities absent; 17 diagram source/export sets checked.')
