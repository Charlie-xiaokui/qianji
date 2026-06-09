import { AppShell } from "@/components/app-shell";
import { UploadZone } from "@/components/upload-zone";

export default function UploadPage() {
  return (
    <AppShell description="移动端优先的账单截图导入入口" title="上传截图">
      <UploadZone />
    </AppShell>
  );
}
