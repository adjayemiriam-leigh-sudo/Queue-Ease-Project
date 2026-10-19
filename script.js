// arrays and objects
const SERVICES = ["Classic Haircut", "Beard Styling", "Full Combo"];
const durations = { "Classic Haircut": 30, "Beard Styling": 20, "Full Combo": 45 };

let clock = 9 * 60; // demo clock in minutes since midnight (09:00)
let nextTicket = 4;

// status is "serving" or "waiting"
let queue = [
  { id: 1, name: "Kofi", service: "Classic Haircut",    status: "serving", joinedAt: 535, startedAt: 535 },
  { id: 2, name: "Ama",  service: "Beard Styling",      status: "waiting", joinedAt: 530 },
  { id: 3, name: "Yaw",  service: "Full Combo",         status: "waiting", joinedAt: 535 },
];

let prebookings = [{ name: "Efua", service: "Beard Styling", time: 10 * 60 }];

// customers already served (used for "Served today" and "Avg wait")
let served = [
  { service: "Classic Haircut",    wait: 5 },
  { service: "Classic Haircut",    wait: 8 },
  { service: "Classic Haircut",    wait: 10 },
  { service: "Beard Styling",      wait: 6 },
  { service: "Beard Styling",      wait: 7 },
  { service: "Full Combo",         wait: 6 },
];
let myTicketId = null; // ticket of the customer who last joined
let myTicketDone = false; // true once the tracked ticket has been handled

//get element by ID shorrtcut
const $ = (id) => document.getElementById(id);
const clockEl = $("clock");
const durationsEl = $("durations");
const queueListEl = $("queueList");
const prebookListEl = $("prebookList");
const nameInput = $("nameInput");
const serviceSelect = $("serviceSelect");
const slotSelect = $("slotSelect");
const messageEl = $("message");
const progressBoxEl = $("progressBox");
const myTicketEl = $("myTicket");


// SVG for the remove button
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

//function to format minutes into HH:MM
function formatTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// show a message in the UI, optionally as an error
function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = "text-lg mt-10 " + (isError ? "text-red-600" : "text-slate-600");
}

// create an element with classes and text
function el(tag, classes, text) {
  const node = document.createElement(tag);
  if (classes) node.className = classes;
  if (text !== undefined) node.textContent = text;
  return node;
}

//function to complete the current serving customer and move them to the served list
function completeServing() {
  const index = queue.findIndex((c) => c.status === "serving");
  if (index === -1) return false; // nobody being served

  const customer = queue[index];
  served.push({ service: customer.service, wait: customer.startedAt - customer.joinedAt });
  queue.splice(index, 1);
  return true;
}

//function to start serving the next waiting customer
function startNext() {
  const next = queue.find((c) => c.status === "waiting");
  if (!next) return false;
  next.status = "serving";
  next.startedAt = clock;
  return true;
}

//function to serve the next customer in the queue
function serveNext() {
  const hadWaiting = queue.some((c) => c.status === "waiting");
  const finished = completeServing();

  // if there was nobody waiting and nobody being served, show a message
  if (!finished && !hadWaiting) {
    showMessage("The queue is empty.", true);
    return;
  }
  startNext();
  render();
}

//function to remove a customer from the queue by their ID
function removeCustomer(id) {
  queue = queue.filter((c) => c.id !== id);
  render();
  // if the removed customer was the one who joined last, clear myTicketId
  queue = queue.filter((c) => c.id !== id);
  if (id === myTicketId) myTicketId = null;   // <-- add this
  render();
}

 

//function to add a customer to the queue
function joinQueue() {
  const name = nameInput.value.trim();
  if (name === "") {
    showMessage("Enter your name first.", true);
    return;
  }
  const service = serviceSelect.value;
  const ticket = nextTicket++;
  queue.push({ id: ticket, name, service, status: "waiting", joinedAt: clock });

  // add this line to store the ticket ID of the customer who just joined
  queue.push({ id: ticket, name, service, status: "waiting", joinedAt: clock });
  myTicketId = ticket;   
  myTicketDone = false; 

  // if nobody is being served, start right away
  if (!queue.some((c) => c.status === "serving")) startNext();

  

  nameInput.value = "";
  showMessage(`${name}, you're #${String(ticket).padStart(3, "0")} for ${service}.`);
  render();
}

//function to prebook a customer for a future time slot
function prebook() {
  const name = nameInput.value.trim();
  if (name === "") {
    showMessage("Enter your name first.", true);
    return;
  }
  if (slotSelect.value === "") {
    showMessage("No slots left today.", true);
    return;
  }
  const time = Number(slotSelect.value);
  const service = serviceSelect.value;

  // block double booking of the same slot
  if (prebookings.some((p) => p.time === time)) {
    showMessage(`${formatTime(time)} is already taken. Pick another slot.`, true);
    return;
  }

  prebookings.push({ name, service, time });
  prebookings.sort((a, b) => a.time - b.time);

  nameInput.value = "";
  showMessage(`${name}, you're booked for ${service} at ${formatTime(time)}.`);
  render();
}

//function to advance the clock by 10 minutes and update the queue accordingly
function advanceClock() {
  clock += 10;

  // prebookings whose time has arrived join the queue
  const arrived = prebookings.filter((p) => p.time <= clock);
  arrived.forEach((p) => {
    queue.push({ id: nextTicket++, name: p.name, service: p.service, status: "waiting", joinedAt: clock });
  });
  prebookings = prebookings.filter((p) => p.time > clock);

  // finish the current service when its time is up
  const current = queue.find((c) => c.status === "serving");
  if (current && clock - current.startedAt >= durations[current.service]) {
    completeServing();
  }
  // start the next customer if the chair is free
  if (!queue.some((c) => c.status === "serving")) startNext();

  render();
}

// build a progress bar element
function progressBar(pct, color = "bg-blue-500") {
  const track = el("div", "w-full h-3 bg-slate-200 rounded-full overflow-hidden");
  const fill = el("div", `h-full rounded-full transition-all ${color}`);
  fill.style.width = pct + "%";
  track.appendChild(fill);
  return track;
}

// minutes left for whoever is being served right now
function remainingForCurrent() {
  const current = queue.find((c) => c.status === "serving");
  if (!current) return 0;
  return Math.max(durations[current.service] - (clock - current.startedAt), 0);
}

// staff view: progress of the customer being served
function renderProgress() {
  progressBoxEl.innerHTML = "";
  const current = queue.find((c) => c.status === "serving");

  if (!current) {
    progressBoxEl.appendChild(el("p", "text-slate-500", "No one is being served."));
    return;
  }

  const total = durations[current.service];
  const elapsed = Math.min(clock - current.startedAt, total);
  const pct = Math.round((elapsed / total) * 100);

  progressBoxEl.appendChild(el("p", "text-slate-600 mb-2", `Now serving: ${current.name} (${current.service})`));
  progressBoxEl.appendChild(progressBar(pct));
  progressBoxEl.appendChild(el("p", "text-sm text-slate-500 mt-2", `${elapsed} of ${total} min · ${pct}%`));
}

// customer view: tracker for the ticket that was just issued
function renderMyTicket() {
  myTicketEl.innerHTML = "";
  if (myTicketId === null) return;

  const me = queue.find((c) => c.id === myTicketId);
    if (!me) {
    myTicketEl.appendChild(el("p", "text-green-700", "Service complete. Thank you for coming!"));
    return;
  }
  // if the ticket is still in the queue, show its status
  if (!myTicketDone) {
      myTicketDone = true;
      showMessage("Pick a service, then join now or prebook a slot.");
    }
    return;
  

  const box = el("div", "bg-stone-50 rounded-2xl p-4");
  box.appendChild(el("p", "font-semibold mb-2", `Ticket #${String(me.id).padStart(3, "0")} · ${me.name}`));

  if (me.status === "serving") {
    const total = durations[me.service];
    const pct = Math.min(Math.round(((clock - me.startedAt) / total) * 100), 100);
    box.appendChild(el("p", "text-blue-800 mb-2", "You're being served now"));
    box.appendChild(progressBar(pct));
  } else {
    // people waiting ahead of me
    const waitingList = queue.filter((c) => c.status === "waiting");
    const ahead = waitingList.slice(0, waitingList.findIndex((c) => c.id === me.id));
    const estimate = remainingForCurrent() + ahead.reduce((sum, c) => sum + durations[c.service], 0);

    box.appendChild(el("p", "text-amber-900 mb-2", `${ahead.length} ahead of you · about ${estimate} min`));
    // 0% while waiting, grows as more people ahead are cleared
    const total = waitingList.length;
    const pct = Math.round(((total - ahead.length - 1) / total) * 100);
    box.appendChild(progressBar(pct, "bg-amber-400"));
  }
  myTicketEl.appendChild(box);
}


//function to render the statistics of the queue, including waiting customers, served customers, average wait time, and prebooked customers
function renderStats() {
  const waiting = queue.filter((c) => c.status === "waiting").length;
  $("statWaiting").textContent = waiting;
  $("statServed").textContent = served.length;

  let avg = 0;
  if (served.length > 0) {
    const total = served.reduce((sum, s) => sum + s.wait, 0);
    avg = Math.round(total / served.length);
  }
  $("statAvg").textContent = `${avg} min`;
  $("statPrebooked").textContent = prebookings.length;
}

//function to render the duration inputs for each service, allowing the user to change the duration of each service
function renderDurations() {
  // only build the inputs once so typing isn't interrupted
  if (durationsEl.children.length > 0) return;

  SERVICES.forEach((service) => {
    const wrap = el("label", "block");
    wrap.appendChild(el("span", "block text-sm text-slate-500 mb-1", service));

    // input for changing the duration of each service
    const input = el("input", "w-full border border-slate-200 rounded-xl px-3 py-2 text-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500");
    input.type = "number";
    input.min = "1";
    input.value = durations[service];
    input.addEventListener("input", () => {
      const value = Number(input.value);
      if (value > 0) {
        durations[service] = value;
        renderQueue();
        renderServiceSelect();
      }
    });
    // append the input to the label and the label to the durations container
    wrap.appendChild(input);
    durationsEl.appendChild(wrap);
  });
}

//function to render the queue of customers, including their ID, name, service, status, and time in the queue
function renderQueue() {
  queueListEl.innerHTML = "";

  if (queue.length === 0) {
    queueListEl.appendChild(el("li", "py-6 text-slate-500", "No one in the queue."));
    return;
  }

  queue.forEach((c) => {
    const li = el("li", "flex items-center gap-3 py-3");
    li.appendChild(el("span", "font-semibold w-10 shrink-0", "#" + String(c.id).padStart(3, "0")));

    // customer info (name and service)
    const info = el("div", "flex-1 min-w-0");
    info.appendChild(el("p", "text-lg leading-tight", c.name));
    info.appendChild(el("p", "text-slate-500", `${c.service} · ${durations[c.service]} min`));
    li.appendChild(info);

    // serving shows start time, waiting shows how long they've waited
    const timeText = c.status === "serving" ? `since ${formatTime(c.startedAt)}` : `${clock - c.joinedAt} min`;
    li.appendChild(el("span", "text-slate-400 text-sm", timeText));

    const badgeStyle = c.status === "serving" ? "bg-blue-100 text-blue-800" : "bg-amber-200 text-amber-900";
    const label = c.status === "serving" ? "Serving" : "Waiting";
    li.appendChild(el("span", `rounded-full px-3 py-1 text-sm ${badgeStyle}`, label));

    // remove button for each customer in the queue
    const removeBtn = el("button", "border border-slate-300 rounded-lg w-9 h-9 flex items-center justify-center hover:bg-red-50 hover:border-red-300");
    removeBtn.innerHTML = CLOSE_ICON;
    removeBtn.setAttribute("aria-label", `Remove ${c.name}`);
    removeBtn.addEventListener("click", () => removeCustomer(c.id));
    li.appendChild(removeBtn);

    queueListEl.appendChild(li);
  });
}

//function to render the list of prebooked customers, including their name, service, and time of booking
function renderPrebookings() {
  prebookListEl.innerHTML = "";
  if (prebookings.length === 0) {
    prebookListEl.appendChild(el("li", "text-slate-400", "None yet."));
    return;
  }
  prebookings.forEach((p) => {
    prebookListEl.appendChild(el("li", "", `${formatTime(p.time)} · ${p.name} · ${p.service}`));
  });
}

//function to render the service selection dropdown, allowing the user to choose a service and see its duration
function renderServiceSelect() {
  const current = serviceSelect.value || SERVICES[0];
  serviceSelect.innerHTML = "";
  SERVICES.forEach((service) => {
    const option = el("option", "", `${service} (${durations[service]} min)`);
    option.value = service;
    serviceSelect.appendChild(option);
  });
  serviceSelect.value = current;
}

//function to render the available time slots for prebooking, starting from 10 minutes after the current clock time and ending at 18:00
function renderSlots() {
  const previous = slotSelect.value;
  slotSelect.innerHTML = "";

  const END_OF_DAY = 18 * 60;
  for (let t = clock + 10; t <= END_OF_DAY; t += 10) {
    const option = el("option", "", formatTime(t));
    option.value = t;
    slotSelect.appendChild(option);
  }
  // keep the old choice if it's still available, otherwise default to 30 min ahead
  if (previous !== "" && Number(previous) > clock) {
    slotSelect.value = previous;
  } else if (slotSelect.options.length > 2) {
    slotSelect.selectedIndex = 2;
  }
}
//function to render the entire UI, including the clock, statistics, durations, progress, queue, prebookings, slots, and the user's ticket
function render() {
  clockEl.textContent = formatTime(clock);
  renderStats();
  renderDurations();
  renderProgress();     
  renderQueue();
  renderPrebookings();
  renderSlots();
  renderMyTicket();     
}

// ---------- EVENTS ----------
$("advanceBtn").addEventListener("click", advanceClock);
$("serveNextBtn").addEventListener("click", serveNext);
$("joinBtn").addEventListener("click", joinQueue);
$("prebookBtn").addEventListener("click", prebook);
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinQueue();
});

// ---------- START  ----------
renderServiceSelect();
render();