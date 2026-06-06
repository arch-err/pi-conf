import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

function contextPercent(ctx: { getContextUsage(): unknown; model?: { contextWindow?: number } }): string {
	const usage = ctx.getContextUsage() as
		| { tokens?: number; usedTokens?: number; totalTokens?: number; contextWindow?: number; percent?: number; ratio?: number }
		| undefined;

	if (!usage) return "ctx --";

	if (typeof usage.percent === "number") return `ctx ${usage.percent.toFixed(1)}%`;
	if (typeof usage.ratio === "number") return `ctx ${(usage.ratio * 100).toFixed(1)}%`;

	const used = usage.tokens ?? usage.usedTokens;
	const total = usage.contextWindow ?? usage.totalTokens ?? ctx.model?.contextWindow;
	if (typeof used === "number" && typeof total === "number" && total > 0) {
		return `ctx ${((used / total) * 100).toFixed(1)}%`;
	}

	return "ctx --";
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsub = footerData.onBranchChange(() => tui.requestRender());

			return {
				dispose: unsub,
				invalidate() {},
				render(width: number): string[] {
					const branch = footerData.getGitBranch();
					const cwd = ctx.cwd.split("/").filter(Boolean).pop() ?? ctx.cwd;
					const leftText = branch ? `${cwd} (${branch})` : cwd;
					const rightText = `${contextPercent(ctx)}  ${ctx.model?.id ?? "no-model"}`;

					const left = theme.fg("dim", leftText);
					const right = theme.fg("dim", rightText);
					const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
					return [truncateToWidth(left + pad + right, width, "")];
				},
			};
		});
	});
}
