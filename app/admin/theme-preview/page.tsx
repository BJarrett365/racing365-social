import Link from "next/link";
import { Panel } from "@/app/components/Panel";
import { BRAND_SUITE } from "@/app/lib/brand";

export const metadata = {
  title: `Theme Preview · Admin · ${BRAND_SUITE}`,
};

export default function ThemePreviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#eab308]">Platform</p>
        <h1 className="mt-1 text-3xl font-black text-white">Theme preview</h1>
        <p className="mt-2 max-w-xl text-slate-400">
          Reference page for tokens and component styling in dark/light mode.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Buttons">
          <div className="flex flex-wrap gap-2">
            <button className="ui-button-primary rounded-lg px-4 py-2 text-sm font-semibold">Primary</button>
            <button className="ui-button-ghost rounded-lg px-4 py-2 text-sm font-semibold">Ghost</button>
            <button className="rounded-lg border px-4 py-2 text-sm font-semibold ui-alert-danger">Danger</button>
          </div>
        </Panel>
        <Panel title="Alerts and badges">
          <div className="space-y-2">
            <div className="ui-alert ui-alert-success text-sm">Success alert for completed actions.</div>
            <div className="ui-alert ui-alert-warning text-sm">Warning alert for review-required states.</div>
            <span className="ui-badge">Active</span>
          </div>
        </Panel>
      </div>

      <Panel title="Form controls">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="ui-input px-3 py-2 text-sm" placeholder="Input example" />
          <select className="ui-select px-3 py-2 text-sm">
            <option>Option one</option>
            <option>Option two</option>
          </select>
          <textarea className="ui-textarea md:col-span-2 min-h-[88px] px-3 py-2 text-sm" placeholder="Textarea example" />
        </div>
      </Panel>

      <Panel title="Table and empty state">
        <table className="ui-table text-sm">
          <thead>
            <tr>
              <th>Template</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>F1 Grid</td>
              <td>Ready</td>
              <td>Today</td>
            </tr>
            <tr>
              <td>TEAMtalk News</td>
              <td>Draft</td>
              <td>Yesterday</td>
            </tr>
          </tbody>
        </table>
        <div className="ui-empty-state mt-4 p-4 text-sm">No recent exports for this filter.</div>
      </Panel>

      <Panel title="Modal shell">
        <div className="ui-modal max-w-md p-4">
          <h3 className="text-base font-semibold text-white">Modal title</h3>
          <p className="mt-2 text-sm text-slate-400">Use this style for confirmations, settings, and quick actions.</p>
        </div>
      </Panel>

      <Link href="/admin" className="inline-flex text-sm font-semibold text-[#22c55e] hover:underline">
        Back to Admin →
      </Link>
    </div>
  );
}
