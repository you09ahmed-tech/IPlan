function SubtaskList({ subtasks }) {
  if (!subtasks || subtasks.length === 0) {
    return <p style={{ marginTop: "10px" }}>No subtasks added.</p>;
  }

  return (
    <ul style={{ marginTop: "10px" }}>
      {subtasks.map((subtask, index) => (
        <li key={index}>{subtask}</li>
      ))}
    </ul>
  );
}

export default SubtaskList;