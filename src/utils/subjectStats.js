export function calculateSubjectStats(subjectName, quests, completedQuests) {
  const safeQuests = quests || [];
  const safeCompletedQuests = completedQuests || [];

  const activeQuestCount = safeQuests.filter((quest) => {
    const status = quest.status || "active";
    return quest.subject === subjectName && status === "active" && !quest.completed;
  }).length;

  const subjectCompletedQuests = safeCompletedQuests.filter(
    (quest) => quest.subject === subjectName
  );

  const completedQuestCount = subjectCompletedQuests.length;
  const totalQuestCount = activeQuestCount + completedQuestCount;

  const progress =
    totalQuestCount > 0
      ? Math.round((completedQuestCount / totalQuestCount) * 100)
      : 0;

  const xpEarned = subjectCompletedQuests.reduce(
    (total, quest) => total + Number(quest.xp || 0),
    0
  );

  return {
    activeQuestCount,
    completedQuestCount,
    totalQuestCount,
    progress,
    xpEarned,
  };
}
