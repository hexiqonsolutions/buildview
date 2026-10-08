"use server";

// Only reads that client components call at runtime belong here: every export of a
// "use server" module is a public POST endpoint. Server code imports from @/lib/data/*.
import { getProjectFolders as loadProjectFolders } from "@/lib/data/documents";
import { getUserAssignments as loadUserAssignments } from "@/lib/data/users";

export async function getProjectFolders(projectId: string) {
  return loadProjectFolders(projectId);
}

export async function getUserAssignments(userId: string) {
  return loadUserAssignments(userId);
}
