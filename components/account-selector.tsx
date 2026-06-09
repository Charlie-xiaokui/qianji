"use client";

import { useImportStore } from "@/store/import-store";

const accountOptions = ["汪一波账户", "戴冠宇账户"];

export function AccountSelector() {
  const account2 = useImportStore((state) => state.account2);
  const setAccount2 = useImportStore((state) => state.setAccount2);

  return (
    <div className="mb-4 rounded-md border bg-card p-4">
      <p className="text-sm font-medium">导入账户</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {accountOptions.map((account) => (
          <label
            className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm"
            key={account}
          >
            <input
              checked={account2 === account}
              name="account2"
              onChange={() => setAccount2(account)}
              type="radio"
              value={account}
            />
            <span>{account}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
