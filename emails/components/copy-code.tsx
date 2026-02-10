export default function CopyCode({ code }: { code: string }) {
	return (
		<code className="inline-block break-all rounded-md border border-neutral-200 border-solid bg-neutral-100 px-4 py-2 text-neutral-500 text-xs">
			{code}
		</code>
	);
}
