import { DocumentBrowser } from "@/components/documents/document-browser";
import type { Document, DocumentFolder } from "@/lib/types";

interface ProjectDocumentsSectionProps {
  folders: DocumentFolder[];
  documents: Document[];
}

export function ProjectDocumentsSection({
  folders,
  documents,
}: ProjectDocumentsSectionProps) {
  return <DocumentBrowser folders={folders} documents={documents} />;
}
