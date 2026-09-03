import re
import os

# 1. Update route.ts to handle attachments
route_path = 'src/app/api/assistant/route.ts'
with open(route_path, 'r', encoding='utf-8') as f:
    route_content = f.read()

# Find the part where messages are mapped:
#   const formattedMessages = messages.map((m: any) => ({
#     role: m.role === 'assistant' ? 'model' : 'user',
#     parts: [{ text: m.content }],
#   }))
new_message_mapper = """
  const formattedMessages = messages.map((m: any) => {
    const parts: any[] = []
    if (m.attachment) {
      parts.push({
        inlineData: {
          data: m.attachment.base64,
          mimeType: m.attachment.type
        }
      })
    }
    parts.push({ text: m.content })
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    }
  })
"""
route_content = re.sub(
    r'const formattedMessages = messages\.map\(\(m: any\) => \(\{\s*role: m\.role === \'assistant\' \? \'model\' : \'user\',\s*parts: \[\{ text: m\.content \}\],\s*\}\)\)',
    new_message_mapper.strip(),
    route_content
)

# Also update the Juan router mapper just in case, though it might not support complex multimodal perfectly for all models.
# It doesn't matter much since we focus on Gemini.

with open(route_path, 'w', encoding='utf-8') as f:
    f.write(route_content)


# 2. Update page.tsx to handle file picker and pass attachment
page_path = 'src/app/(protected)/assistant/page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

# Add Paperclip to imports
page_content = page_content.replace('MicOff, Brain, Zap, RefreshCw, Trash2, ChevronDown, Loader2', 'MicOff, Brain, Zap, RefreshCw, Trash2, ChevronDown, Loader2, Paperclip, FileText, Image as ImageIcon')

# Add attachment state
page_content = page_content.replace(
    'const [loading, setLoading] = useState(false)',
    "const [loading, setLoading] = useState(false)\n  const [attachment, setAttachment] = useState<{file: File, base64: string, type: string} | null>(null)\n  const fileInputRef = useRef<HTMLInputElement>(null)"
)

# Add handleFileChange
handle_file_change = """
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      alert("File size must be less than 15MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      setAttachment({ file, base64, type: file.type })
    }
    reader.readAsDataURL(file)
  }
"""
page_content = page_content.replace(
    'const speakResponse = (text: string, onEndCallback?: () => void) => {',
    handle_file_change.strip() + '\n\n  const speakResponse = (text: string, onEndCallback?: () => void) => {'
)

# Update sendMessage to include attachment
send_msg_body = """
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
"""
new_send_msg_body = """
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })).map((m, i, arr) => {
            // Attach the file only to the latest user message
            if (i === arr.length - 1 && attachment) {
              return { ...m, attachment: { base64: attachment.base64, type: attachment.type } }
            }
            return m
          }),
"""
page_content = page_content.replace(send_msg_body, new_send_msg_body)

# Clear attachment on send
page_content = page_content.replace(
    'setInput(\'\')\n    setLoading(true)',
    'setInput(\'\')\n    setAttachment(null)\n    setLoading(true)'
)

# Add UI for attachment preview and button
input_ui = """
      {/* Input */}
      <div className="glass-card" style={{ padding: 16, flexShrink: 0 }}>
        {attachment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,212,255,0.1)', borderRadius: 8, width: 'fit-content', marginBottom: 10, border: '1px solid rgba(0,212,255,0.3)' }}>
            {attachment.type.startsWith('image/') ? <ImageIcon size={14} color="#00d4ff" /> : <FileText size={14} color="#00d4ff" />}
            <span style={{ fontSize: 12, color: '#e8f4ff', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.file.name}</span>
            <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', color: '#ff3366', cursor: 'pointer', marginLeft: 8 }}><Trash2 size={12} /></button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,audio/*,video/*,application/pdf,text/plain" />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: 10, flexShrink: 0 }} title="Attach File">
            <Paperclip size={16} />
          </button>
"""
page_content = page_content.replace(
    '      {/* Input */}\n      <div className="glass-card" style={{ padding: 16, flexShrink: 0 }}>\n        <div style={{ display: \'flex\', gap: 10, alignItems: \'flex-end\' }}>',
    input_ui
)

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_content)

print("Attachment support added.")
