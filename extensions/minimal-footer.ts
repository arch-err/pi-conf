import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

function contextRatio(ctx: { getContextUsage(): unknown; model?: { contextWindow?: number } }): number | undefined {
	const usage = ctx.getContextUsage() as
		| { tokens?: number; usedTokens?: number; totalTokens?: number; contextWindow?: number; percent?: number; ratio?: number }
		| undefined;

	if (!usage) return undefined;
	if (typeof usage.ratio === "number") return usage.ratio;
	if (typeof usage.percent === "number") return usage.percent / 100;

	const used = usage.tokens ?? usage.usedTokens;
	const total = usage.contextWindow ?? usage.totalTokens ?? ctx.model?.contextWindow;
	if (typeof used === "number" && typeof total === "number" && total > 0) return used / total;

	return undefined;
}

function contextBar(ratio: number | undefined, width = 14): string {
	if (ratio === undefined) return `[${"-".repeat(width)}]`;
	const clamped = Math.max(0, Math.min(1, ratio));
	const filled = Math.round(clamped * width);
	return `[${"█".repeat(filled)}${"░".repeat(width - filled)}]`;
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
					const model = ctx.model?.id ?? "no-model";
					const thinking = pi.getThinkingLevel();
					const rightText = `${contextBar(contextRatio(ctx))}  ${model} • ${thinking}`;

					const left = theme.fg("dim", leftText);
					const right = theme.fg("dim", rightText);
					const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
					return [truncateToWidth(left + pad + right, width, "")];
				},
			};
		});
	});
}
