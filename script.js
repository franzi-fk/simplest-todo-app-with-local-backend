/*__________________________ GLOBAL SCOPE ____________________________*/

let idCount = 0;

let appStateTodos;
let appStateFilters;

const btnAdd = document.querySelector("#btn-add-todo");
const btnRemoveDone = document.querySelector("#btn-remove-done");
const inpNewTodo = document.querySelector("#inp-new-todo");
let filteredTodos;
const apiUrl = "http://localhost:3000/todos/";

/*_________________________________________________________________*/
/*_____________________________ INIT _______________________________*/

// Check localStorage for data for filters
appStateFilters = JSON.parse(localStorage.getItem("appStateFilters")) || {
  all: true,
  open: false,
  done: false,
};

init();

/*_________________________________________________________________*/
/*_____________________ FUNCTION DEFINITIONS ________________________*/

async function init() {
  renderFilters(); // Initial rendering of filters
  await fetchTodos();
  filteredTodos = appStateTodos;
  applyFilter();
  renderTodos(); // Initial rendering of the todo list

  btnAdd.addEventListener("click", addTodo);
  btnRemoveDone.addEventListener("click", removeDoneTodos);
}

// Function to update appStateTodos with the data from backend
async function fetchTodos() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error. Status: ${response.status}`);
    }
    return (appStateTodos = await response.json());
  } catch (error) {
    console.error("Error fetching todos:", error);
  }
}

// Function to apply filter and define filteredTodos
function applyFilter() {
  // Reset filteredTodos to appStateTodos
  filteredTodos = appStateTodos;

  // Modify filteredTodos depending on filter & todo.done
  if (appStateFilters.open === true) {
    filteredTodos = filteredTodos.filter((todo) => todo.done === false);
  } else if (appStateFilters.done === true) {
    filteredTodos = filteredTodos.filter((todo) => todo.done === true);
  }
  // If 'all' is selected, filteredTodos will remain as appStateTodos, no change needed
}

// Function to render filters
function renderFilters() {
  const filtersList = document.querySelector("#filters");
  filtersList.innerHTML = "";

  // Loop through the filter keys in the appStateFilters object
  Object.keys(appStateFilters).forEach((filterKey) => {
    const filtersListEl = document.createElement("li");
    const filterRadio = document.createElement("input");
    filterRadio.type = "radio";
    filterRadio.name = "filter"; // Ensures radio buttons are grouped
    filterRadio.id = filterKey; // Set the radio button id to the filter key (all, done, open)

    // Set radio button status
    filterRadio.checked = appStateFilters[filterKey];

    // Add filterObj to radio button
    filterRadio.filterObj = appStateFilters;
    filterRadio.filterKey = filterKey; // Store the key separately

    // add label for radio button
    const radioLabel = document.createElement("label");
    radioLabel.setAttribute("for", filterKey); // label.for = ... wouldnt work because "for" is a reserved keyword in JavaScript
    const radioLabelText = document.createTextNode(filterKey);

    // Add to DOM
    filtersList.append(filtersListEl);
    filtersListEl.append(filterRadio);
    filtersListEl.append(radioLabel);
    radioLabel.append(radioLabelText);

    filterRadio.addEventListener("change", updateFilters);
  });
}

// Function to render the todo list
function renderTodos() {
  const list = document.querySelector("#list");
  list.innerHTML = ""; // Clear the existing list before rendering

  // Loop through each todo item in the appStateTodos
  filteredTodos.forEach((todo) => {
    const todoLi = document.createElement("li"); // Create a list item element
    const checkbox = document.createElement("input"); // Create a checkbox input element
    checkbox.type = "checkbox"; // Set the input type to checkbox
    checkbox.checked = todo.done; // Set the checkbox state based on the todo item
    checkbox.id = "checkbox-" + todo.id;

    checkbox.todoObj = todo; // Attach the todo object to the checkbox (so the checkbox knows which to do it belongs to -> needed for definition of updateTodoState())

    // Add an event listener to update the done when the checkbox is clicked
    checkbox.addEventListener("change", updateTodoState);

    const checkboxLabel = document.createElement("label");
    checkboxLabel.setAttribute("for", checkbox.id);
    const todoText = document.createTextNode(todo.description); // Create a text node with the todo description
    checkboxLabel.append(todoText); // Append the text to the list item
    todoLi.append(checkbox, checkboxLabel); // Add the checkbox & label to the list item

    list.append(todoLi); // Add the list item to the list element
  });
}

// Callback function for evenListener > to add a new todo
async function addTodo(event) {
  event.preventDefault();
  const inpNewTodoValue = inpNewTodo.value.trim(); // Removes spaces from input value

  // Check if user input is empty
  if (inpNewTodoValue === "") {
    inpNewTodo.value = ""; // clear input field
    return; // return (dont add todo)
  }

  // Check if user tries to add a duplicate todo
  if (
    appStateTodos.some(
      (todo) => todo.description.toLowerCase() === inpNewTodoValue.toLowerCase()
    ) // Check if any todo in appStateTodos has a description that matches inpNewTodoValue (case-insensitive)
  ) {
    showHintDuplicate();
    return; // return (dont add todo)
  }

  // Add new todo to backend
  await postTodo(inpNewTodoValue); // pass todo description to the postTodo function

  // Re-fetch the todos from the backend
  // this is necessary to update appStateTodos in case we manually changed the state in the backend (e.g. via postman),
  // or if another user can interact and change the backend state as well
  // await fetchTodos();

  applyFilter();
  renderTodos();
  inpNewTodo.value = ""; // clear input field
  inpNewTodo.focus();

  // Scroll the list container to the bottom after adding a todo
  const contentContainer = document.querySelector("#content");
  setTimeout(() => {
    // Ensure that the list container scrolls to bottom
    contentContainer.scrollTop = contentContainer.scrollHeight;
  }, 100); // Small delay to ensure DOM is rendering before scrolling happens
}

// Post new todo into backend
async function postTodo(TodoDescription) {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ description: TodoDescription, done: false }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error. Status: ${response.status}`);
    }

    const newTodo = await response.json(); // Get new todo from backend
    appStateTodos.push(newTodo); // Update app state
  } catch (error) {
    console.error("Error adding todo:", error);
  }
}

// Callback function for eventListener > to update the done state of a todo item
async function updateTodoState(event) {
  const todo = event.target.todoObj; // Get the associated todo object from the checkbox
  const currentTodoState = event.target.checked; // Get the updated checkbox state

  await patchTodo(todo.id, currentTodoState); // call patchTodo and pass the required information

  // Re-fetch the todos from the backend
  // this is necessary to update appStateTodos in case we manually changed the state in the backend (e.g. via postman),
  // or if another user can interact and change the backend state as well
  // await fetchTodos();

  setTimeout(() => {
    applyFilter(); // Reapply the filter after the delay
    renderTodos(); // Re-render the todo list after the filter is applied
    updateFiltersInLocalStorage();
  }, 500);
}

// Change todo done state in backend
async function patchTodo(todoId, todoDoneState) {
  try {
    const response = await fetch(`${apiUrl}${todoId}`, {
      method: "PATCH",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ done: todoDoneState }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error. Status: ${response.status}`);
    }

    const updatedTodo = await response.json(); // Get updated todo from backend as a response

    // Update appStateTodos
    appStateTodos = appStateTodos.map((todo) => {
      if (updatedTodo.id === todo.id) {
        // use map method with id must match condition
        todo.done = updatedTodo.done; // update todo done state
        return todo;
      } else {
        return todo;
      }
    });
  } catch (error) {
    console.error("Error updating todo:", error);
  }
}

// Callback function for eventListener > to update filters
function updateFilters(event) {
  const appStateFilters = event.target.filterObj; // Reference to appStateFilters
  const selectedFilterKey = event.target.filterKey; // Key of the clicked filter

  // Update all appStateFilters
  Object.keys(appStateFilters).forEach((key) => {
    appStateFilters[key] = key === selectedFilterKey; // key === selectedFilterKey returns true or false, depending on whether the current key is the one the user selected
  });

  applyFilter(); // Reapply the filter based on updated filters
  renderFilters(); // Re-render the filters based on updated filters
  renderTodos(); // Re-render the todos based on the updated filteredTodos
  updateFiltersInLocalStorage();
}

// Callback function for eventListener > to remove done todos
async function removeDoneTodos(event) {
  // create array with only done todos
  const doneTodos = appStateTodos.filter((todo) => todo.done === true);

  // Loop through the done todos and delete each one from the backend
  for (const todo of doneTodos) {
    await deleteTodo(todo.id);
  }

  // After all deletes, update appStateTodos calling fetchTodos()
  await fetchTodos();

  applyFilter();
  renderTodos();
}

// Delete todo in backend
async function deleteTodo(todoId) {
  try {
    const response = await fetch(`${apiUrl}${todoId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`HTTP error. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error updating todo:", error);
  }
}

// Function that shows a hint that this to do already exists
function showHintDuplicate() {
  const hintDuplicate = document.createElement("span");
  hintDuplicate.id = "hint-duplicate";
  const hintDuplicateText = document.createTextNode("Todo already exists.");
  hintDuplicate.append(hintDuplicateText);

  const div = document.querySelector("#content");
  div.append(hintDuplicate);

  // Set a timeout to remove the warning message after 6 seconds (6000 milliseconds)
  setTimeout(() => {
    hintDuplicate.remove();
  }, 2400); // remove hint after 3s
  inpNewTodo.value = "";
  inpNewTodo.focus();
}

// Function to save current appStateFilters to Local Storage
function updateFiltersInLocalStorage() {
  localStorage.setItem("appStateFilters", JSON.stringify(appStateFilters));
}
