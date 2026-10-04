import WorkspaceShell from "@/components/workspace/WorkspaceShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
