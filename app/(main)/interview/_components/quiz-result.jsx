"use client";

import { Trophy, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function QuizResult({ result, hideStartNew = false, onStartNew }) {
  if (!result) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-2 text-xl font-semibold">
        <Trophy className="h-5 w-5 text-yellow-500" />
        Quiz Results
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{result.quizScore.toFixed(1)}%</span>
      </div>
      <Progress value={result.quizScore} />

      {/* Improvement Tip */}
      {result.improvementTip && (
        <div className="bg-muted rounded-md p-4 space-y-1">
          <p className="font-medium">Improvement Tip:</p>
          <p className="text-muted-foreground text-sm">{result.improvementTip}</p>
        </div>
      )}

      {/* Question Review */}
      <div className="space-y-3">
        <p className="font-medium">Question Review</p>

        {result.questions.map((q, index) => (
          <div
            key={index}
            className="border rounded-md p-3 space-y-2 bg-card text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{q.question}</p>
              {q.isCorrect ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>

            <div className="text-muted-foreground space-y-1">
              <p>Your answer: {q.userAnswer}</p>
              {!q.isCorrect && <p>Correct answer: {q.answer}</p>}
            </div>

            <div className="bg-muted rounded p-2 space-y-1">
              <p className="font-medium">Explanation:</p>
              <p className="text-muted-foreground">{q.explanation}</p>
            </div>
          </div>
        ))}
      </div>

      {!hideStartNew && (
        <CardFooter className="pt-2">
          <Button onClick={onStartNew} className="w-full">
            Start New Quiz
          </Button>
        </CardFooter>
      )}
    </div>
  );
}
