"""Owned, version-bound deliverables. All text stays local; no external renderer."""
import copy
import io
import re
import textwrap
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

ASSETS = Path(__file__).parent / "assets"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/package/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"
X = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
for prefix, ns in (("a", A), ("p", P), ("r", R)):
    ET.register_namespace(prefix, ns)


def selected_model(company, memo=None, version=None):
    target = memo['model_version'] if memo else version
    return next((m for m in company.models if m['version'] == target), None) if target else (company.models[-1] if company.models and not memo else None)


def presentation_content(company, revision, memo):
    origin = "FICTIONAL DEMONSTRATION" if company.illustrative else "CAPTURED RESEARCH"
    sections = memo['text'].split('\n\n')
    cover = sections.pop(0)
    company_title = cover.split('\n')[0].split(' · ', 1)[-1]
    title = company_title if len(company_title) < 56 else "Company investment review"
    slides = [{"title": title, "body": (company_title+'\n' if title!=company_title else '')+f"Investment review\nMemo v{memo['version']} / " + (f"model v{memo['model_version']}" if memo['model_version'] else "evidence-only Pass") + f"\nPrepared by {memo['owner']}\n{memo['at'][:10]}\n{origin}", "kicker": "WHISTLE / INVESTMENT REVIEW"}]
    for section in sections:
        lines = section.split('\n')
        heading = lines.pop(0)
        wrapped = []
        for line in lines:
            wrapped.extend(textwrap.wrap(line, width=78, break_long_words=True, break_on_hyphens=False) or [''])
        for offset in range(0, len(wrapped), 9):
            slides.append({"title":heading.title() + (" / continued" if offset else ""), "body":'\n'.join(wrapped[offset:offset+9]),"kicker":f"{origin} / FROZEN MEMO V{memo['version']}"})
    # Complete source registry and excerpts, not a changing list from today's record.
    for source in memo['sources']:
        content=f"{source['id']} / {source['title']}\n{source.get('url') or source.get('file')}\nCaptured {source['captured_at']}\nMethod: {source['method']}\n{source['excerpt']}"
        lines=[]
        for line in content.split('\n'):
            lines.extend(textwrap.wrap(line,width=78,break_long_words=True,break_on_hyphens=False) or [''])
        for offset in range(0,len(lines),9):
            slides.append({"title":f"Source {source['id']}"+(" / continued" if offset else ""),"body":'\n'.join(lines[offset:offset+9]),"kicker":"SOURCE APPENDIX / FROZEN EVIDENCE"})
    footer=f"Whistle / memo v{memo['version']} / research r{memo['company_revision']} / {origin}"
    refs='\n'.join(f"[{s['id']}] {s['title']} / {s.get('url') or s.get('file')} / captured {s['captured_at']}" for s in memo['sources'])
    return [{**s,"footer":footer+f" / {i+1:02d}","notes":refs} for i,s in enumerate(slides)]


def replace_shape_text(root, mapping):
    for tag in root.findall('.//{'+P+'}sp'):
        for node in tag.findall('.//{'+A+'}t'):
            if node.text not in mapping:
                continue
            value=mapping[node.text]
            paragraph=next(p for p in tag.findall('.//{'+A+'}p') if node in p.iter())
            parent=next(p for p in tag.iter() if paragraph in list(p))
            position=list(parent).index(paragraph)
            parent.remove(paragraph)
            for i,line in enumerate(value.split('\n')):
                cloned=copy.deepcopy(paragraph)
                texts=cloned.findall('.//{'+A+'}t')
                texts[0].text=line
                for t in texts[1:]: t.text=''
                parent.insert(position+i,cloned)
            break


def presentation_pptx(slides):
    with zipfile.ZipFile(ASSETS/'review-template.pptx') as template:
        files={n:template.read(n) for n in template.namelist()}
    slide=files['ppt/slides/slide1.xml']
    notes=files.get('ppt/notesSlides/notesSlide1.xml')
    presentation=ET.fromstring(files['ppt/presentation.xml'])
    ids=presentation.find('{'+P+'}sldIdLst')
    for item in list(ids): ids.remove(item)
    rels=ET.fromstring(files['ppt/_rels/presentation.xml.rels'])
    types=ET.fromstring(files['[Content_Types].xml'])
    for item in list(rels):
        if item.get('Type','').endswith('/slide'): rels.remove(item)
    for item in list(types):
        if re.fullmatch(r'/ppt/(slides/slide|notesSlides/notesSlide)\d+\.xml',item.get('PartName','')): types.remove(item)
    # Remove template slide parts before rebuilding the complete registry.
    for name in list(files):
        if name.startswith(('ppt/slides/','ppt/notesSlides/')): del files[name]
    with zipfile.ZipFile(ASSETS/'review-template.pptx') as template:
        slide_rels=template.read('ppt/slides/_rels/slide1.xml.rels')
        notes_rels=template.read('ppt/notesSlides/_rels/notesSlide1.xml.rels') if notes else None
    for i,content in enumerate(slides,1):
        root=ET.fromstring(slide)
        replace_shape_text(root,{'{{TITLE}}':content['title'],'{{BODY}}':content['body'],'{{KICKER}}':content['kicker'],'{{FOOTER}}':content['footer']})
        files[f'ppt/slides/slide{i}.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        sr=ET.fromstring(slide_rels)
        for link in sr:
            if link.get('Type','').endswith('/notesSlide'): link.set('Target',f'../notesSlides/notesSlide{i}.xml')
        files[f'ppt/slides/_rels/slide{i}.xml.rels']=ET.tostring(sr,encoding='utf-8',xml_declaration=True)
        if notes:
            nr=ET.fromstring(notes);replace_shape_text(nr,{'{{NOTES}}':content['notes']})
            files[f'ppt/notesSlides/notesSlide{i}.xml']=ET.tostring(nr,encoding='utf-8',xml_declaration=True)
            nrel=ET.fromstring(notes_rels)
            for link in nrel:
                if link.get('Type','').endswith('/slide'): link.set('Target',f'../slides/slide{i}.xml')
            files[f'ppt/notesSlides/_rels/notesSlide{i}.xml.rels']=ET.tostring(nrel,encoding='utf-8',xml_declaration=True)
            ET.SubElement(types,'{'+CT+'}Override',PartName=f'/ppt/notesSlides/notesSlide{i}.xml',ContentType='application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml')
        rid=f'rIdScope{i}'
        ET.SubElement(ids,'{'+P+'}sldId',id=str(255+i),attrib={'{'+R+'}id':rid})
        ET.SubElement(rels,'{'+REL+'}Relationship',Id=rid,Type=R+'/slide',Target=f'slides/slide{i}.xml')
        ET.SubElement(types,'{'+CT+'}Override',PartName=f'/ppt/slides/slide{i}.xml',ContentType='application/vnd.openxmlformats-officedocument.presentationml.slide+xml')
    files['ppt/presentation.xml']=ET.tostring(presentation,encoding='utf-8',xml_declaration=True)
    files['ppt/_rels/presentation.xml.rels']=ET.tostring(rels,encoding='utf-8',xml_declaration=True)
    ET.register_namespace('',CT)
    files['[Content_Types].xml']=ET.tostring(types,encoding='utf-8',xml_declaration=True)
    return zip_bytes(files)


def zip_bytes(files):
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w',zipfile.ZIP_DEFLATED) as bundle:
        for name,data in files.items(): bundle.writestr(name,data)
    return stream.getvalue()


def memo_pdf(company, memo):
    from reportlab.lib import colors
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.pagesizes import A4
    output=io.BytesIO()
    title=ParagraphStyle('Title',fontName='Helvetica-Bold',fontSize=25,leading=30,textColor=colors.HexColor('#132A4A'),spaceAfter=16)
    heading=ParagraphStyle('Section',fontName='Helvetica-Bold',fontSize=12,leading=17,textColor=colors.HexColor('#132A4A'),spaceBefore=15,spaceAfter=7)
    body=ParagraphStyle('Body',fontName='Helvetica',fontSize=10,leading=15,textColor=colors.HexColor('#253D5C'),spaceAfter=7,alignment=TA_LEFT,splitLongWords=True)
    def clean(text):
        return escape(text.replace('—','-').replace('–','-').replace('→','->').replace('•','-')).replace('\n','<br/>')
    origin='FICTIONAL DEMONSTRATION' if company.illustrative else 'CAPTURED RESEARCH'
    content=[Paragraph('WHISTLE / '+origin,heading)]
    for index,section in enumerate(memo['text'].split('\n\n')):
        lines=section.split('\n',1)
        content.append(Paragraph(clean(lines[0]),title if index==0 else heading))
        if len(lines)>1: content.append(Paragraph(clean(lines[1]),body))
    content.extend([PageBreak(),Paragraph('Frozen source register',title)])
    for s in memo['sources']:
        content.append(Paragraph(clean(f"[{s['id']}] {s['title']}"),heading))
        content.append(Paragraph(clean(f"{s.get('url') or s.get('file')}\nCaptured {s['captured_at']} / {s['method']}\n{s['excerpt']}"),body))
    def page(canvas,doc):
        canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#52647A'))
        canvas.drawString(42,25,f"Whistle / memo v{memo['version']} / research r{memo['company_revision']} / {origin}")
        canvas.drawRightString(A4[0]-42,25,str(doc.page))
    SimpleDocTemplate(output,pagesize=A4,leftMargin=42,rightMargin=42,topMargin=42,bottomMargin=45,title='Whistle investment committee memo',author=memo['owner']).build(content,onFirstPage=page,onLaterPages=page)
    return output.getvalue()


def set_cell(root,address,value,formula=None,cached=None):
    data=root.find('{'+X+'}sheetData')
    number=int(re.search(r'\d+',address)[0])
    row=next((r for r in data if int(r.get('r'))==number),None)
    if row is None:
        row=ET.SubElement(data,'{'+X+'}row',r=str(number))
    cell=next((c for c in row if c.get('r')==address),None)
    if cell is None: cell=ET.SubElement(row,'{'+X+'}c',r=address)
    for item in list(cell): cell.remove(item)
    if formula is not None:
        cell.attrib.pop('t',None);ET.SubElement(cell,'{'+X+'}f').text=formula
        if cached is not None: ET.SubElement(cell,'{'+X+'}v').text=str(cached)
    elif isinstance(value,(int,float)):
        cell.attrib.pop('t',None);ET.SubElement(cell,'{'+X+'}v').text=str(value)
    else:
        cell.set('t','inlineStr');ET.SubElement(ET.SubElement(cell,'{'+X+'}is'),'{'+X+'}t').text=str(value or '')
    return cell


def model_xlsx(company, model, frozen_sources=None):
    with zipfile.ZipFile(ASSETS/'model-template.xlsx') as z: files={n:z.read(n) for n in z.namelist()}
    root=ET.fromstring(files['xl/worksheets/sheet1.xml'])
    # Keep calculated cells protected while leaving the blue scenario inputs editable.
    styles=ET.fromstring(files['xl/styles.xml'])
    xfs=styles.find('{'+X+'}cellXfs'); unlocked={}
    for col in 'BCD':
        for row in range(9,17):
            cell=next(c for c in root.iter('{'+X+'}c') if c.get('r')==f'{col}{row}')
            original=int(cell.get('s','0'))
            if original not in unlocked:
                xf=copy.deepcopy(xfs[original]);xf.set('applyProtection','1')
                protection=xf.find('{'+X+'}protection')
                if protection is None: protection=ET.SubElement(xf,'{'+X+'}protection')
                protection.set('locked','0');unlocked[original]=len(xfs);xfs.append(xf)
            cell.set('s',str(unlocked[original]))
    xfs.set('count',str(len(xfs)));files['xl/styles.xml']=ET.tostring(styles,encoding='utf-8',xml_declaration=True)
    set_cell(root,'A1',company.name+' / underwriting')
    set_cell(root,'A3',f"Frozen model v{model['version']} / {model['at'][:10]} / {'FICTIONAL DEMONSTRATION' if company.illustrative else 'ANALYST SCENARIOS'} / USD")
    set_cell(root,'A4','Simplified equity returns; no fees, taxes, debt or liquidation preferences. Blue cells are inputs.')
    labels={5:'Scenario',6:'MOIC',7:'IRR',9:'Entry pre-money / USD',10:'Initial check / USD',11:'Aggregate dilution',12:'Follow-on check / USD',13:'Follow-on post-money / USD',14:'Hold / years',15:'Exit ARR / USD',16:'Exit multiple',19:'Initial ownership',20:'Exit ownership',21:'Exit equity value / USD',22:'Exit proceeds / USD',23:'Total invested / USD',24:'MOIC',25:'IRR',29:'Cash-flow year'}
    for row,label in labels.items(): set_cell(root,f'A{row}',label)
    keys=['pre_money','check','dilution','follow_on','follow_on_post_money','years','arr','multiple']
    base=model['inputs']
    for col,name,factor,multiple in [('B','Downside',.5,.7),('C','Base',1,1),('D','Upside',1.5,1.3)]:
        set_cell(root,col+'5',name);set_cell(root,col+'29','Cash flow / USD')
        vals={**base,'arr':base['arr']*factor,'multiple':base['multiple']*multiple}
        for row,key in enumerate(keys,9):
            c=set_cell(root,f'{col}{row}',vals[key])
        scenario=model['scenarios'][name]
        formulas={19:(f'{col}10/({col}9+{col}10)',scenario['initial_ownership']),20:(f'{col}19*(1-{col}11)+{col}12/{col}13',scenario['exit_ownership']),21:(f'{col}15*{col}16',scenario['exit_value']),22:(f'{col}20*{col}21',scenario['proceeds']),23:(f'{col}10+{col}12',scenario['invested']),24:(f'{col}22/{col}23',scenario['moic']),25:(f'IRR({col}30:{col}50)',scenario['irr']),6:(f'{col}24',scenario['moic']),7:(f'{col}25',scenario['irr'])}
        for row,(formula,value) in formulas.items(): set_cell(root,f'{col}{row}',None,formula,value)
        for year in range(21):
            row=30+year;set_cell(root,f'A{row}',year)
            value=(-base['check'] if year==0 else 0)+(-base['follow_on'] if year==min(2,base['years']) else 0)+(scenario['proceeds'] if year==base['years'] else 0)
            set_cell(root,f'{col}{row}',None,f'IF($A{row}=0,-{col}$10,IF($A{row}=MIN(2,{col}$14),-{col}$12,0))+IF($A{row}={col}$14,{col}$22,0)',value)
    set_cell(root,'E5','Source / rationale');set_cell(root,'F5','Owner / last modified')
    assumptions={a['id']:a for a in model['assumptions']}
    for row,key in enumerate(keys,9):
        a=assumptions.get(key,{})
        set_cell(root,f'E{row}',f"{a.get('source_id') or 'Analyst assumption'} / {a.get('rationale','')}")
        set_cell(root,f'F{row}',f"{a.get('owner',model['owner'])} / {a.get('modified_at',model['at'])[:10]}")
    # Sort native row/cell order after filling sparse template cells.
    protection=ET.Element('{'+X+'}sheetProtection',sheet='1',objects='1',scenarios='1',selectLockedCells='0',selectUnlockedCells='0')
    root.insert(list(root).index(root.find('{'+X+'}sheetData'))+1,protection)
    validation=ET.Element('{'+X+'}dataValidations',count='8')
    for row in range(9,17):
        kind='whole' if row==14 else 'decimal'
        op='between' if row in (11,14) else 'greaterThanOrEqual' if row==12 else 'greaterThan'
        rule=ET.SubElement(validation,'{'+X+'}dataValidation',type=kind,operator=op,sqref=f'B{row}:D{row}',showErrorMessage='1',errorStyle='stop',errorTitle='Invalid scenario input',error='Use a valid positive input, dilution 0–99.99%, or a whole holding period of 1–20 years.')
        ET.SubElement(rule,'{'+X+'}formula1').text='1' if row==14 else '0'
        if row in (11,14): ET.SubElement(rule,'{'+X+'}formula2').text='20' if row==14 else '0.9999'
    root.insert(list(root).index(protection)+1,validation)
    def finish(sheet):
        data=sheet.find('{'+X+'}sheetData')
        for row in data: row[:]=sorted(row,key=lambda c:(len(re.match(r'[A-Z]+',c.get('r'))[0]),re.match(r'[A-Z]+',c.get('r'))[0]))
        data[:]=sorted(data,key=lambda r:int(r.get('r')))
        dim=sheet.find('{'+X+'}dimension')
        if dim is not None: dim.set('ref',f'A1:F{max(int(r.get("r")) for r in data)}')
        views=sheet.find('{'+X+'}sheetViews')
        if views is not None:
            for view in views: view.set('showGridLines','0')
        return ET.tostring(sheet,encoding='utf-8',xml_declaration=True)
    files['xl/worksheets/sheet1.xml']=finish(root)
    sources=ET.fromstring(files['xl/worksheets/sheet2.xml'])
    registry=frozen_sources if frozen_sources is not None else model.get('sources')
    set_cell(sources,'A1','Captured source registry');set_cell(sources,'A3','Frozen source records for this artifact.' if registry is not None else 'Earlier model: current sources shown; original source snapshot unavailable.')
    set_cell(sources,'A4','Review the dated excerpt and method before relying on an input.')
    for col,value in zip('ABCDEF',['ID','Title','URL / file','Captured','Method','Excerpt']): set_cell(sources,col+'5',value)
    for row,source in enumerate(registry if registry is not None else [s.model_dump() for s in company.sources],6):
        for col,value in zip('ABCDEF',[source['id'],source['title'],source.get('url') or source.get('file'),source['captured_at'],source['method'],source['excerpt']]): set_cell(sources,f'{col}{row}',value)
    # Display the complete captured excerpts in readable continuation rows.
    source_data=sources.find('{'+X+'}sheetData')
    for row in list(source_data):
        if int(row.get('r'))>=6: source_data.remove(row)
    source_style=copy.deepcopy(xfs[0]);source_style.set('applyAlignment','1')
    alignment=source_style.find('{'+X+'}alignment')
    if alignment is None: alignment=ET.SubElement(source_style,'{'+X+'}alignment')
    alignment.set('wrapText','1');alignment.set('vertical','top')
    style_id=len(xfs);xfs.append(source_style);xfs.set('count',str(len(xfs)))
    files['xl/styles.xml']=ET.tostring(styles,encoding='utf-8',xml_declaration=True)
    row_number=6
    for source in registry if registry is not None else [s.model_dump() for s in company.sources]:
        excerpt=source['excerpt'];chunks=[excerpt[i:i+700] for i in range(0,len(excerpt),700)] or ['']
        for index,chunk in enumerate(chunks):
            values=[source['id']+(f' / {index+1}' if index else ''),source['title'],source.get('url') or source.get('file'),source['captured_at'],source['method'],chunk]
            for col,value in zip('ABCDEF',values): set_cell(sources,f'{col}{row_number}',value).set('s',str(style_id))
            row=next(r for r in source_data if int(r.get('r'))==row_number)
            lines=max(sum(max(1,(len(line)+width-1)//width) for line in str(value or '').split('\n')) for value,width in zip(values,[32,18,18,18,35,35]))
            row.set('ht',str(min(409,max(40,lines*16+8))));row.set('customHeight','1');row_number+=1
    files['xl/worksheets/sheet2.xml']=finish(sources)
    wb=ET.fromstring(files['xl/workbook.xml'])
    calc=wb.find('{'+X+'}calcPr')
    if calc is None: calc=ET.SubElement(wb,'{'+X+'}calcPr')
    calc.set('fullCalcOnLoad','1');calc.set('forceFullCalc','1');calc.set('calcMode','auto')
    files['xl/workbook.xml']=ET.tostring(wb,encoding='utf-8',xml_declaration=True)
    files.pop('vc-input-style',None)
    if model.get('operating_projection'):
        from backend.operating_export import append_operating_sheet
        append_operating_sheet(files,model['operating_projection'],ASSETS,set_cell)
    return zip_bytes(files)


def calendar_ics(company, meeting):
    def txt(value): return str(value).replace('\\','\\\\').replace('\r','').replace('\n','\\n').replace(';','\\;').replace(',','\\,')
    stamp=lambda d:d.astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    description=f"{meeting.agenda}\nCompany: {company.name}\nClaims: {', '.join(meeting.claim_ids) or 'None selected'}\nMemo: {meeting.memo_version or 'Not selected'}\nOwner: {meeting.owner}"
    lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Whistle//Investment Review//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',f'UID:{meeting.id}-{company.id}@vc-scope.local',f'DTSTAMP:{stamp(datetime.now(timezone.utc))}',f'DTSTART:{stamp(meeting.starts_at)}',f'DTEND:{stamp(meeting.starts_at+timedelta(minutes=meeting.duration_minutes))}',f'SEQUENCE:{meeting.sequence}',f'SUMMARY:{txt(meeting.title)}',f'LOCATION:{txt(meeting.location)}',f'DESCRIPTION:{txt(description)}','STATUS:'+('CANCELLED' if meeting.status=='Cancelled' else 'CONFIRMED'),'END:VEVENT','END:VCALENDAR']
    # RFC 5545 folding uses octets, not characters; preserve UTF-8 boundaries.
    folded=[]
    for line in lines:
        current=''
        for char in line:
            if len((current+char).encode('utf-8'))>73:
                folded.append(current);current=' '+char
            else: current+=char
        folded.append(current)
    return ('\r\n'.join(folded)+'\r\n').encode('utf-8')
