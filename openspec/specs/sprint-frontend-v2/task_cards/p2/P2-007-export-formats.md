# P2-007: 实现多格式导出

## 元信息

| 字段 | 值 |
|------|-----|
| ID | P2-007 |
| Phase | 2 - 编辑器 |
| 优先级 | P1 |
| 状态 | Pending |
| 依赖 | P2-001 |

## 目标

实现多格式导出功能，支持 Word (.docx)、PDF、HTML 导出，满足创作者投稿、打印、发布等不同场景需求。

## 任务清单

- [ ] 创建导出菜单/对话框
- [ ] 实现 Markdown 导出（保留）
- [ ] 实现 Word (.docx) 导出
- [ ] 实现 PDF 导出
- [ ] 实现 HTML 导出
- [ ] 实现纯文本导出
- [ ] 实现剪贴板富文本复制
- [ ] 实现平台格式适配（公众号/知乎等）

## 验收标准

- [ ] Word 导出保留所有格式
- [ ] PDF 导出可正常打印
- [ ] HTML 导出代码干净可用
- [ ] 复制到公众号/知乎格式正确

## 产出

- `src/features/export/ExportDialog.tsx`
- `src/lib/export/exportToWord.ts`
- `src/lib/export/exportToPdf.ts`
- `src/lib/export/exportToHtml.ts`
- `src/lib/export/clipboardAdapter.ts`

## 技术细节

### 导出对话框

```tsx
function ExportDialog({ content, fileName }: ExportDialogProps) {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导出文档</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4">
          <ExportOption
            icon={<FileText size={24} />}
            label="Markdown"
            description="通用文本格式"
            onClick={() => exportToMarkdown(content, fileName)}
          />
          <ExportOption
            icon={<FileWord size={24} />}
            label="Word"
            description="适合投稿、打印"
            onClick={() => exportToWord(content, fileName)}
          />
          <ExportOption
            icon={<FilePdf size={24} />}
            label="PDF"
            description="适合分享、打印"
            onClick={() => exportToPdf(content, fileName)}
          />
          <ExportOption
            icon={<FileCode size={24} />}
            label="HTML"
            description="适合网页发布"
            onClick={() => exportToHtml(content, fileName)}
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={close}>取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Word 导出

```typescript
// lib/export/exportToWord.ts
import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function exportToWord(
  content: JSONContent,  // TipTap JSON
  fileName: string
): Promise<void> {
  // 将 TipTap JSON 转换为 docx 文档结构
  const doc = new Document({
    sections: [{
      children: convertToDocxParagraphs(content),
    }],
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
}

function convertToDocxParagraphs(content: JSONContent): Paragraph[] {
  // 递归转换 TipTap 节点到 docx 节点
  return content.content?.map(node => {
    switch (node.type) {
      case 'heading':
        return new Paragraph({
          text: getTextContent(node),
          heading: `Heading${node.attrs.level}`,
        });
      case 'paragraph':
        return new Paragraph({
          children: convertInlineNodes(node.content),
        });
      case 'bulletList':
        return convertListItems(node, 'bullet');
      // ... 其他节点类型
    }
  }) || [];
}
```

### PDF 导出

```typescript
// lib/export/exportToPdf.ts
import { jsPDF } from 'jspdf';

export async function exportToPdf(
  content: JSONContent,
  fileName: string
): Promise<void> {
  // 方案 1：通过 HTML 中间格式
  const html = convertToHtml(content);
  const pdf = new jsPDF();
  
  await pdf.html(html, {
    callback: (doc) => {
      doc.save(`${fileName}.pdf`);
    },
    x: 15,
    y: 15,
    width: 180,
  });
}
```

### 剪贴板适配

```typescript
// lib/export/clipboardAdapter.ts
export async function copyWithFormat(
  content: JSONContent,
  platform?: 'wechat' | 'zhihu' | 'xiaohongshu'
): Promise<void> {
  const html = convertToHtml(content, {
    platform,  // 不同平台的样式适配
  });
  const text = convertToPlainText(content);
  
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    }),
  ]);
}
```

### 平台适配要点

| 平台 | 适配要点 |
|------|---------|
| 微信公众号 | 无外链、图片需 base64、特殊样式 |
| 知乎 | 支持 Markdown、有字数限制 |
| 小红书 | 强调图片、短文本、表情符号 |
| 今日头条 | 标准 HTML |

## 依赖库

- `docx` - Word 文档生成
- `jspdf` - PDF 生成
- `file-saver` - 文件下载
