import Link from "next/link";
import { AccountSelector } from "@/components/account-selector";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/button";
import { TransactionTable } from "@/components/transaction-table";

export default function ReviewPage() {
  return (
    <AppShell description="确认交易、分类和重复记录" title="审核记录">
      <div className="mb-4 flex justify-end">
        <Link href="/export">
          <Button>生成 CSV</Button>
        </Link>
      </div>
      <AccountSelector />
      <TransactionTable />
    </AppShell>
  );
}
