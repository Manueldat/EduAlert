BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(191) NOT NULL,
    [email] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [passwordHash] NVARCHAR(191) NOT NULL,
    [role] NVARCHAR(191) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'ADVISOR',
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(191) NOT NULL,
    [userId] NVARCHAR(191) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Program] (
    [id] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [totalCredits] INT NOT NULL,
    [creditsPerTerm] INT NOT NULL,
    CONSTRAINT [Program_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AdvisingClass] (
    [id] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [advisorId] NVARCHAR(191) NOT NULL,
    [programId] NVARCHAR(191) NOT NULL,
    CONSTRAINT [AdvisingClass_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdvisingClass_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Student] (
    [id] NVARCHAR(191) NOT NULL,
    [code] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [classId] NVARCHAR(191) NOT NULL,
    [status] NVARCHAR(191) NOT NULL CONSTRAINT [Student_status_df] DEFAULT 'ACTIVE',
    [entryOrdinal] INT NOT NULL CONSTRAINT [Student_entryOrdinal_df] DEFAULT 1,
    [admissionScore] FLOAT(53),
    [revision] INT NOT NULL CONSTRAINT [Student_revision_df] DEFAULT 1,
    CONSTRAINT [Student_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Student_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Term] (
    [id] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [ordinal] INT NOT NULL,
    CONSTRAINT [Term_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Term_name_key] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [Term_ordinal_key] UNIQUE NONCLUSTERED ([ordinal])
);

-- CreateTable
CREATE TABLE [dbo].[Course] (
    [id] NVARCHAR(191) NOT NULL,
    [code] NVARCHAR(191) NOT NULL,
    [name] NVARCHAR(191) NOT NULL,
    [credits] INT NOT NULL,
    [prerequisiteId] NVARCHAR(191),
    CONSTRAINT [Course_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Course_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Semester] (
    [id] NVARCHAR(191) NOT NULL,
    [studentId] NVARCHAR(191) NOT NULL,
    [termId] NVARCHAR(191) NOT NULL,
    [finalized] BIT NOT NULL CONSTRAINT [Semester_finalized_df] DEFAULT 0,
    [paused] BIT NOT NULL CONSTRAINT [Semester_paused_df] DEFAULT 0,
    [officialWarning] BIT NOT NULL CONSTRAINT [Semester_officialWarning_df] DEFAULT 0,
    CONSTRAINT [Semester_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Semester_studentId_termId_key] UNIQUE NONCLUSTERED ([studentId],[termId])
);

-- CreateTable
CREATE TABLE [dbo].[Grade] (
    [id] NVARCHAR(191) NOT NULL,
    [semesterId] NVARCHAR(191) NOT NULL,
    [courseId] NVARCHAR(191) NOT NULL,
    [score] FLOAT(53),
    CONSTRAINT [Grade_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Grade_semesterId_courseId_key] UNIQUE NONCLUSTERED ([semesterId],[courseId])
);

-- CreateTable
CREATE TABLE [dbo].[Assessment] (
    [id] NVARCHAR(191) NOT NULL,
    [studentId] NVARCHAR(191) NOT NULL,
    [fingerprint] NVARCHAR(191) NOT NULL,
    [revision] INT NOT NULL,
    [termOrdinal] INT,
    [targetOrdinal] INT,
    [priority] NVARCHAR(191) NOT NULL,
    [mlStatus] NVARCHAR(191) NOT NULL,
    [modelVersion] NVARCHAR(191),
    [probability] FLOAT(53),
    [payload] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Assessment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Assessment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Alert] (
    [id] NVARCHAR(191) NOT NULL,
    [studentId] NVARCHAR(191) NOT NULL,
    [termOrdinal] INT NOT NULL,
    [severity] NVARCHAR(191) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Alert_active_df] DEFAULT 1,
    [workflow] NVARCHAR(191) NOT NULL CONSTRAINT [Alert_workflow_df] DEFAULT 'NEW',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Alert_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Alert_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Alert_studentId_termOrdinal_key] UNIQUE NONCLUSTERED ([studentId],[termOrdinal])
);

-- CreateTable
CREATE TABLE [dbo].[Note] (
    [id] NVARCHAR(191) NOT NULL,
    [alertId] NVARCHAR(191) NOT NULL,
    [authorId] NVARCHAR(191) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [workflow] NVARCHAR(191) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Note_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Note_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Audit] (
    [id] NVARCHAR(191) NOT NULL,
    [actorId] NVARCHAR(191) NOT NULL,
    [action] NVARCHAR(191) NOT NULL,
    [subjectId] NVARCHAR(191) NOT NULL,
    [details] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Audit_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Audit_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Assessment_studentId_createdAt_idx] ON [dbo].[Assessment]([studentId], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdvisingClass] ADD CONSTRAINT [AdvisingClass_advisorId_fkey] FOREIGN KEY ([advisorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdvisingClass] ADD CONSTRAINT [AdvisingClass_programId_fkey] FOREIGN KEY ([programId]) REFERENCES [dbo].[Program]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Student] ADD CONSTRAINT [Student_classId_fkey] FOREIGN KEY ([classId]) REFERENCES [dbo].[AdvisingClass]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Course] ADD CONSTRAINT [Course_prerequisiteId_fkey] FOREIGN KEY ([prerequisiteId]) REFERENCES [dbo].[Course]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Semester] ADD CONSTRAINT [Semester_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Semester] ADD CONSTRAINT [Semester_termId_fkey] FOREIGN KEY ([termId]) REFERENCES [dbo].[Term]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Grade] ADD CONSTRAINT [Grade_semesterId_fkey] FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Grade] ADD CONSTRAINT [Grade_courseId_fkey] FOREIGN KEY ([courseId]) REFERENCES [dbo].[Course]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Assessment] ADD CONSTRAINT [Assessment_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Alert] ADD CONSTRAINT [Alert_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Note] ADD CONSTRAINT [Note_alertId_fkey] FOREIGN KEY ([alertId]) REFERENCES [dbo].[Alert]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Note] ADD CONSTRAINT [Note_authorId_fkey] FOREIGN KEY ([authorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

