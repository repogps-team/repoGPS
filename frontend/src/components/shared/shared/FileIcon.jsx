const FileIcon = ({ mimeType }) => {
  const icons = {
    'application/pdf': '📄',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  }
  return <span>{icons[mimeType] || '📎'}</span>
}

export default FileIcon
