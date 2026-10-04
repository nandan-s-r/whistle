"""Bind a frozen forecast into the native, artifact-authored Excel template."""
import copy
import textwrap
import zipfile
from xml.etree import ElementTree as ET


def package_xml(root, namespace):
    # Use the package root's default namespace for reader compatibility.
    # Strip only this tree's element namespace; avoid process-global serializer
    # registrations that could race with another concurrent export.
    root=copy.deepcopy(root)
    for element in root.iter():
        if element.tag.startswith('{'+namespace+'}'):
            element.tag=element.tag[len(namespace)+2:]
    root.set('xmlns',namespace)
    return ET.tostring(root,encoding='utf-8',xml_declaration=True)


def append_operating_sheet(files, projection, assets, set_cell):
    from backend.workspace_exports import X, R, REL, CT
    with zipfile.ZipFile(assets/'operating-template.xlsx') as z:
        sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        incoming=ET.fromstring(z.read('xl/styles.xml'))
        shared=ET.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else None
    styles=ET.fromstring(files['xl/styles.xml'])
    # Merge style references without changing the existing return/source sheets.
    offsets={}
    for name in ('fonts','fills','borders'):
        dest=styles.find('{'+X+'}'+name);src=incoming.find('{'+X+'}'+name)
        offsets[name]=len(dest)
        for item in src:dest.append(copy.deepcopy(item))
        dest.set('count',str(len(dest)))
    formats=styles.find('{'+X+'}numFmts')
    if formats is None:
        formats=ET.Element('{'+X+'}numFmts');styles.insert(0,formats)
    next_format=max([163]+[int(n.get('numFmtId')) for n in formats])+1;number_map={}
    for item in incoming.find('{'+X+'}numFmts') or []:
        new=copy.deepcopy(item);identity=int(item.get('numFmtId'));number_map[identity]=next_format
        new.set('numFmtId',str(next_format));formats.append(new);next_format+=1
    formats.set('count',str(len(formats)))
    xfs=styles.find('{'+X+'}cellXfs');style_offset=len(xfs)
    for item in incoming.find('{'+X+'}cellXfs'):
        new=copy.deepcopy(item)
        for attr,collection in (('fontId','fonts'),('fillId','fills'),('borderId','borders')):
            new.set(attr,str(int(new.get(attr,'0'))+offsets[collection]))
        new.set('xfId','0');num=int(new.get('numFmtId','0'))
        if num in number_map:new.set('numFmtId',str(number_map[num]))
        xfs.append(new)
    xfs.set('count',str(len(xfs)))
    returns=ET.fromstring(files['xl/worksheets/sheet1.xml'])
    for col,factor in [('B',.5),('C',1),('D',1.5)]:
        cell=set_cell(returns,f'{col}15',None,f"'Operating forecast'!I{12+len(projection['rows'])}*{factor}",projection['rows'][-1]['arr']*factor)
        # A linked forecast driver is a cross-sheet calculation, not a blue hardcode.
        xf=copy.deepcopy(xfs[int(cell.get('s','0'))]);font=copy.deepcopy(styles.find('{'+X+'}fonts')[int(xf.get('fontId','0'))])
        color=font.find('{'+X+'}color')
        if color is None:color=ET.SubElement(font,'{'+X+'}color')
        color.attrib.clear();color.set('rgb','FF0F766E');fonts=styles.find('{'+X+'}fonts');xf.set('fontId',str(len(fonts)));fonts.append(font);fonts.set('count',str(len(fonts)))
        cell.set('s',str(len(xfs)));xfs.append(xf)
    xfs.set('count',str(len(xfs)))
    files['xl/worksheets/sheet1.xml']=ET.tostring(returns,encoding='utf-8',xml_declaration=True)
    for cell in sheet.iter('{'+X+'}c'):
        cell.set('s',str(int(cell.get('s','0'))+style_offset))
        if cell.get('t')=='s':
            index=int(cell.find('{'+X+'}v').text)
            value=''.join(t.text or '' for t in shared[index].iter('{'+X+'}t'))
            set_cell(sheet,cell.get('r'),value)
    for col in sheet.iter('{'+X+'}col'):
        if col.get('style'):col.set('style',str(int(col.get('style'))+style_offset))
    set_cell(sheet,'D4',f"{projection['name']} / frozen v{projection['version']}")
    set_cell(sheet,'D5',projection['currency']);set_cell(sheet,'D6',projection['base_period'])
    set_cell(sheet,'D8',projection['base_revenue']);set_cell(sheet,'D9',projection['base_arr'])
    data=sheet.find('{'+X+'}sheetData')
    for row in list(data):
        if 13+len(projection['rows'])<=int(row.get('r'))<=32:data.remove(row)
    for i,(year,computed) in enumerate(zip(projection['years'],projection['rows'])):
        r=13+i
        for col,key in [('D','revenue_growth'),('E','arr_growth'),('F','gross_margin'),('G','operating_expense')]:set_cell(sheet,f'{col}{r}',year[key])
        for col,key,formula in [('H','revenue',f'{"H"+str(r-1) if i else "$D$8"}*(1+D{r})'),('I','arr',f'{"I"+str(r-1) if i else "$D$9"}*(1+E{r})'),('J','gross_profit',f'H{r}*F{r}'),('K','contribution',f'J{r}-G{r}')]:set_cell(sheet,f'{col}{r}',None,formula,computed[key])
    notes=[f"Prepared by {projection['owner']} / {projection['at']}",projection['method'],
           'Revenue definition: '+projection['revenue_definition'],'ARR definition: '+projection['arr_definition'],
           'Operating expense definition: '+projection['expense_definition'],'Forecast rationale: '+projection['rationale'],
           'Starting-data sources: '+', '.join(projection['source_ids'])+'. Full excerpts are in the source register.']
    row=34
    note_style=next(c.get('s') for c in sheet.iter('{'+X+'}c') if c.get('r')=='C34')
    for note in notes:
        for line in textwrap.wrap(note,width=125) or ['']:
            set_cell(sheet,f'C{row}',line).set('s',note_style);row+=1
    for item in data:item[:]=sorted(item,key=lambda c:(len(c.get('r').rstrip('0123456789')),c.get('r').rstrip('0123456789')))
    data[:]=sorted(data,key=lambda r:int(r.get('r')))
    dim=sheet.find('{'+X+'}dimension')
    if dim is not None:dim.set('ref',f'C1:K{row}')
    files['xl/worksheets/sheet3.xml']=ET.tostring(sheet,encoding='utf-8',xml_declaration=True)
    files['xl/styles.xml']=ET.tostring(styles,encoding='utf-8',xml_declaration=True)
    workbook=ET.fromstring(files['xl/workbook.xml']);rels=ET.fromstring(files['xl/_rels/workbook.xml.rels'])
    identity='rIdWhistleOperating'
    while identity in {r.get('Id') for r in rels}:identity+='x'
    ET.SubElement(workbook.find('{'+X+'}sheets'),'{'+X+'}sheet',name='Operating forecast',sheetId='3',attrib={'{'+R+'}id':identity})
    ET.SubElement(rels,'{'+REL+'}Relationship',Id=identity,Type=R+'/worksheet',Target='worksheets/sheet3.xml')
    content=ET.fromstring(files['[Content_Types].xml'])
    ET.SubElement(content,'{'+CT+'}Override',PartName='/xl/worksheets/sheet3.xml',ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml')
    files['xl/workbook.xml']=ET.tostring(workbook,encoding='utf-8',xml_declaration=True)
    files['xl/_rels/workbook.xml.rels']=package_xml(rels,REL)
    files['[Content_Types].xml']=package_xml(content,CT)
