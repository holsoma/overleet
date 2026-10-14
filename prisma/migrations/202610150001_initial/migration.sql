CREATE TYPE "Difficulty" AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE "Category" AS ENUM ('ml_theory', 'statistics', 'ab_testing', 'llms');
CREATE TYPE "ProgressStatus" AS ENUM ('unseen', 'completed', 'review_later');
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "githubId" TEXT NOT NULL UNIQUE, "name" TEXT, "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Question" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "difficulty" "Difficulty" NOT NULL,
  "category" "Category" NOT NULL, "companyTags" TEXT[] NOT NULL,
  "companyEvidence" JSONB NOT NULL, "questionMarkdown" TEXT NOT NULL,
  "tldrAnswer" TEXT NOT NULL, "detailedAnswerMarkdown" TEXT NOT NULL,
  "keyTakeaways" TEXT[] NOT NULL, "sources" JSONB NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "contentHash" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "UserProgress" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "status" "ProgressStatus" NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("userId", "questionId")
);
CREATE TABLE "QuestionVote" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "questionId")
);
CREATE INDEX "QuestionVote_questionId_idx" ON "QuestionVote"("questionId");
CREATE TABLE "DailyQuestion" (
  "date" TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
