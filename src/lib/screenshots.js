import { supabase } from './supabaseClient'

const BUCKET = 'huddle-screenshots'

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

export async function uploadSectionScreenshots(reportId, section, items) {
  for (const item of items) {
    const path = `${reportId}/${section}/${Date.now()}-${sanitizeFileName(item.file.name)}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file)
    if (uploadError) throw uploadError

    const { error: insertError } = await supabase.from('section_screenshots').insert({
      report_id: reportId,
      section,
      storage_path: path,
      caption: item.caption || null,
    })
    if (insertError) throw insertError
  }
}

export function screenshotPublicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data.publicUrl
}
