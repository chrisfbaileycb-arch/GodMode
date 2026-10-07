import React, { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/20/solid';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from './components/ui/dialog';
import { Button } from './components/ui/button';

export function PromptCritic(props: {
	active?: boolean;
	superprompt: string;
	setSuperprompt: (p: string) => void;
}) {
	const { active, superprompt, setSuperprompt } = props;
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [analysis, setAnalysis] = useState<string | null>(null);
	const [improvedPrompt, setImprovedPrompt] = useState<string>('');
	const [error, setError] = useState<string | null>(null);

	const handleOpen = () => {
		setIsOpen(true);
		setError(null);
		setAnalysis(null);
		setImprovedPrompt(superprompt);
		if (superprompt.trim().length >= 5) {
			runAnalysis(superprompt);
		}
	};

	const runAnalysis = async (promptToAnalyze: string) => {
		if (!promptToAnalyze || promptToAnalyze.trim().length < 5) {
			setError('Please enter a longer prompt to analyze (at least 5 characters).');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/prompt-critic', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt: promptToAnalyze }),
			});
			const data = await res.json();
			if (data.analysis) {
				setAnalysis(data.analysis);
				// Extract suggested prompt if present, or format nicely
				const suggestionMatch = data.analysis.match(/(?:Suggested Improved Prompt:|Improved version:?)\s*["']?([\s\S]+?)["']?$/i);
				if (suggestionMatch && suggestionMatch[1]) {
					setImprovedPrompt(suggestionMatch[1].trim());
				} else {
					setImprovedPrompt(promptToAnalyze);
				}
			}
		} catch (err: any) {
			setError('Failed to analyze prompt. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const applyImprovedPrompt = () => {
		if (improvedPrompt) {
			setSuperprompt(improvedPrompt);
			setIsOpen(false);
		}
	};

	return (
		<>
			<button
				className={`px-4 py-2 text-sm w-full flex items-center justify-start ${
					active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
				}`}
				onClick={handleOpen}
			>
				<SparklesIcon className="inline w-4 h-4 mr-2 text-yellow-500" />
				PromptCritic
			</button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="max-w-2xl bg-white text-gray-900">
					<DialogHeader>
						<DialogTitle className="flex items-center text-lg font-bold">
							<SparklesIcon className="w-5 h-5 mr-2 text-yellow-500" />
							PromptCritic Analysis & Optimizer
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div>
							<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
								Current Prompt
							</label>
							<div className="p-3 bg-gray-50 rounded-md border text-sm font-mono text-gray-800 max-h-28 overflow-y-auto">
								{superprompt || '(No prompt entered)'}
							</div>
						</div>

						{error && (
							<div className="p-2.5 bg-red-50 text-red-700 rounded-md text-xs">
								{error}
							</div>
						)}

						{loading ? (
							<div className="flex flex-col items-center justify-center p-8 space-y-2 text-gray-500">
								<div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
								<span className="text-sm">Analyzing prompt with AI...</span>
							</div>
						) : analysis ? (
							<div className="space-y-3">
								<div>
									<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
										AI Feedback & Improvements
									</label>
									<div className="p-3 bg-indigo-50 border border-indigo-100 rounded-md text-sm text-gray-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
										{analysis}
									</div>
								</div>

								<div>
									<label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
										Edit & Apply Optimized Prompt
									</label>
									<textarea
										rows={4}
										value={improvedPrompt}
										onChange={(e) => setImprovedPrompt(e.target.value)}
										className="w-full p-2.5 text-sm font-mono border rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
										placeholder="Edit the improved prompt here..."
									/>
								</div>
							</div>
						) : null}

						<div className="flex justify-end space-x-2 pt-2 border-t">
							<Button variant="outline" onClick={() => setIsOpen(false)}>
								Cancel
							</Button>
							{!analysis && !loading && (
								<Button
									onClick={() => runAnalysis(superprompt)}
									className="bg-indigo-600 text-white hover:bg-indigo-700"
								>
									Run Analysis
								</Button>
							)}
							{analysis && (
								<Button
									onClick={applyImprovedPrompt}
									className="bg-indigo-600 text-white hover:bg-indigo-700"
								>
									Apply to Superprompt
								</Button>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
