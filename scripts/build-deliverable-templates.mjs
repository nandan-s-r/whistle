import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
// Run with the bundled artifact runtime, or set ARTIFACT_TOOL_MODULE to its file URL.
const { Presentation, PresentationFile, Workbook, SpreadsheetFile } = await import(process.env.ARTIFACT_TOOL_MODULE || '@oai/artifact-tool');
const destination = new URL('../backend/assets/', import.meta.url);
if (process.argv[2] === 'pptx') {
  const p = Presentation.create({slideSize:{width:1280,height:720}});
  const s = p.slides.add(); s.background.fill='#F4F6F8';
  const box=(text,x,y,w,h,size,color,bold=false)=>{
    const b=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
    b.text=text;b.text.style={typeface:'Arial',fontSize:size,color,bold,autoFit:'none'};return b;
  };
  box('{{KICKER}}',72,40,1120,32,17,'#2563EB',true);
  box('{{TITLE}}',72,100,1120,130,44,'#0B1220',true);
  box('{{BODY}}',72,260,1120,340,27,'#132A4A');
  box('{{FOOTER}}',72,646,1120,38,16,'#52647A');
  s.speakerNotes.textFrame.setText('{{NOTES}}');
  await (await PresentationFile.exportPptx(p)).save(fileURLToPath(new URL('review-template.pptx',destination)));
  const png=await p.export({slide:s,format:'png',scale:1});await fs.writeFile(new URL('../scratch/template-preview.png',import.meta.url),new Uint8Array(await png.arrayBuffer()));
} else {
  const w=Workbook.create();
  for(const name of ['Model','Sources']){
    const s=w.worksheets.add(name);
    s.getRange('A1:F80').format.font={name:'Arial',size:11,color:'#0B1220'};
    s.getRange('A1:F80').format.rowHeight=26;
    s.getRange('A1:A80').format.columnWidth=34;
    s.getRange('B1:D80').format.columnWidth=20;
    s.getRange('E1:F80').format.columnWidth=38;
    s.getRange('A1:F2').format.font={name:'Arial',size:18,bold:true,color:'#132A4A'};
    s.getRange('A5:F5').format.fill='#E8EFFA';s.getRange('A5:F5').format.font={name:'Arial',size:11,bold:true,color:'#132A4A'};
    s.getRange('A1').values=[['{{TITLE}}']];s.getRange('A3').values=[['{{SCOPE}}']];
    s.getRange('A4').values=[['{{METHOD}}']];
    s.getRange('B6:D40').setNumberFormat('#,##0.00');
    s.getRange('B9:D16').format.font={name:'Arial',size:11,color:'#2563EB'};
    s.getRange('E9:F16').format.wrapText=true;s.getRange('A9:F16').format.rowHeight=64;
    for(const range of ['B7:D7','B11:D11','B19:D20','B25:D25']) s.getRange(range).setNumberFormat('0.0%');
    for(const range of ['B6:D6','B24:D24']) s.getRange(range).setNumberFormat('0.00"x"');
  }
  w.recalculate();
  await (await SpreadsheetFile.exportXlsx(w)).save(fileURLToPath(new URL('model-template.xlsx',destination)));
}
