"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import QuizResult from "./quiz-result";
import { BarLoader } from "react-spinners";

export default function Quiz({ generateQuiz, saveQuiz }) {
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [result, setResult] = useState(null);
  const [pending, start] = useTransition();

  const startQuiz = () => {
    start(async () => {
      try {
        const q = await generateQuiz();
        setQuizData(q);
        setAnswers(new Array(q.length).fill(null));
      } catch (err) {
        toast.error("Failed to load quiz");
      }
    });
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((ans, i) => {
      if (ans === quizData[i].correctAnswer) correct++;
    });
    return (correct / quizData.length) * 100;
  };

  const finishQuiz = () => {
    const score = calculateScore();
    start(async () => {
      try {
        const res = await saveQuiz(quizData, answers, score);
        setResult(res);
        toast.success("Quiz completed!");
      } catch (err) {
        toast.error("Failed to save result");
      }
    });
  };

  const startNewQuiz = () => {
    setQuizData(null);
    setAnswers([]);
    setCurrent(0);
    setShowExplanation(false);
    setResult(null);
  };

  if (pending && !quizData) {
    return <BarLoader className="mt-4" width="100%" color="gray" />;
  }

if (result) {
  return (
    <div className="mx-2 space-y-4">
      <QuizResult result={result} onStartNew={startNewQuiz} />

      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={startNewQuiz}>
          Try Again
        </Button>

   <Link href="/interview">
  <Button>
    Back to Interview Preparation
  </Button>
</Link>


      </div>
    </div>
  );
}



  if (!quizData) {
    return (
      <Card className="mx-2">
        <CardHeader>
          <CardTitle>Ready to test your knowledge?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This quiz contains 10 questions specific to your industry and skills.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={startQuiz} className="w-full">
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const q = quizData[current];

  return (
    <Card className="mx-2">
      <CardHeader>
        <CardTitle>
          Question {current + 1} of {quizData.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{q.question}</p>

        <RadioGroup
          onValueChange={(val) => {
            const copy = [...answers];
            copy[current] = val;
            setAnswers(copy);
          }}
          value={answers[current]}
          className="space-y-2"
        >
          {q.options.map((op, i) => (
            <div key={i} className="flex items-center space-x-2">
              <RadioGroupItem value={op} id={`opt-${i}`} />
              <Label htmlFor={`opt-${i}`}>{op}</Label>
            </div>
          ))}
        </RadioGroup>

        {showExplanation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Explanation:</p>
            <p className="text-muted-foreground">{q.explanation}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!showExplanation && (
          <Button
            variant="outline"
            onClick={() => setShowExplanation(true)}
            disabled={!answers[current]}
          >
            Show Explanation
          </Button>
        )}

        <Button
          onClick={() => {
            if (current === quizData.length - 1) finishQuiz();
            else {
              setShowExplanation(false);
              setCurrent(current + 1);
            }
          }}
          disabled={!answers[current]}
          className="ml-auto"
        >
          {current < quizData.length - 1 ? "Next Question" : "Finish Quiz"}
        </Button>
      </CardFooter>
    </Card>
  );
}
