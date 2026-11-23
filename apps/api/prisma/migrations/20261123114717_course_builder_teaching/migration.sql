-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "liveEndsOn" DATE,
ADD COLUMN     "liveStartsOn" DATE,
ADD COLUMN     "teacherId" UUID;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "topicId" UUID;

-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN     "notifiedAt" TIMESTAMP(3),
ADD COLUMN     "slotId" UUID;

-- CreateTable
CREATE TABLE "CourseTopic" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSlot" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "positionSec" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePoll" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivePoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePollVote" (
    "id" UUID NOT NULL,
    "pollId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "option" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivePollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseTopic_courseId_sortOrder_idx" ON "CourseTopic"("courseId", "sortOrder");

-- CreateIndex
CREATE INDEX "LiveSlot_courseId_idx" ON "LiveSlot"("courseId");

-- CreateIndex
CREATE INDEX "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "LivePoll_sessionId_idx" ON "LivePoll"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LivePollVote_pollId_userId_key" ON "LivePollVote"("pollId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_slotId_scheduledAt_key" ON "LiveSession"("slotId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CourseTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "LiveSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSlot" ADD CONSTRAINT "LiveSlot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePoll" ADD CONSTRAINT "LivePoll_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollVote" ADD CONSTRAINT "LivePollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollVote" ADD CONSTRAINT "LivePollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

