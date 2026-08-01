const subCopy = {
  id: "6a6b73620d9bccc913607710",
  title: "Subtask 1",
  completed: false,
  deadline: "2026-08-02",
  lifecycle: {
    status: "DUE_SOON",
    isDueToday: false,
    isDueSoon: true,
    isOverdue: false
  },
  deadlineInfo: {
    type: "TOMORROW",
    label: "Tomorrow"
  }
};

let allSubtasks = [];

if (!subCopy.completed && subCopy.lifecycle && subCopy.deadlineInfo) {
  const isToday = subCopy.lifecycle.isDueToday;
  const isOverdue = subCopy.lifecycle.isOverdue;
  const isDueSoon = subCopy.lifecycle.isDueSoon;
  
  console.log("Conditions:", {isToday, isOverdue, isDueSoon});
  if (isToday || isOverdue || isDueSoon) {
    allSubtasks.push(subCopy);
  }
}
console.log("allSubtasks length:", allSubtasks.length);
