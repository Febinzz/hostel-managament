const backend = "https://hostel-managament-1.onrender.com";


// ------------------ HELPER FUNCTION ------------------
function renderTable(el, data) {
    if (!el) return;
    if (!data || data.length === 0) {
        el.innerHTML = "<tr><td colspan='5'>No data found</td></tr>";
        return;
    }

    // Table headers
    const headers = Object.keys(data[0]);
    let html = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";

    // Table rows
    data.forEach(row => {
        html += "<tr>" + headers.map(h => `<td>${row[h] ?? ""}</td>`).join("") + "</tr>";
    });

    el.innerHTML = html;
}

// ------------------ LOAD REPORTS ------------------
async function loadReports() {
    try {
        // Students with allocations
        const studentsRes = await fetch(`${backend}/report/students`);
        const students = await studentsRes.json();
        const studentTable = document.querySelector("#studentReport tbody");
        if (studentTable) {
            studentTable.innerHTML = ""; // clear
            students.forEach(s => {
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${s.name}</td>
                                <td>${s.roll_no}</td>
                                <td>${s.course}</td>
                                <td>${s.room_number ?? "Not Allocated"}</td>`;
                studentTable.appendChild(tr);
            });
        }

        // Students without allocation
        const unallocRes = await fetch(`${backend}/report/unallocated`);
        const unallocated = await unallocRes.json();
        const unallocTable = document.querySelector("#unallocatedReport tbody");
        if (unallocTable) {
            unallocTable.innerHTML = ""; // clear
            unallocated.forEach(s => {
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${s.name}</td>
                                <td>${s.roll_no}</td>
                                <td>${s.course}</td>`;
                unallocTable.appendChild(tr);
            });
        }

        // Rooms report
        const roomsRes = await fetch(`${backend}/report/rooms`);
        const rooms = await roomsRes.json();
        const roomTable = document.querySelector("#roomReport tbody");
        if (roomTable) {
            roomTable.innerHTML = ""; // clear
            rooms.forEach(r => {
                const tr = document.createElement("tr");
                tr.innerHTML = `<td>${r.room_number}</td>
                                <td>${r.capacity}</td>
                                <td>${r.occupied}</td>
                                <td>${r.status}</td>`;
                roomTable.appendChild(tr);
            });
        }

    } catch (err) {
        console.error("Error loading reports:", err);
    }
}

// ------------------ RUN ON PAGE LOAD ------------------
window.addEventListener("DOMContentLoaded", loadReports);

// ------------------ FADE-IN EFFECT ------------------
document.addEventListener("DOMContentLoaded", () => {
    const containers = document.querySelectorAll(".container");
    containers.forEach(container => {
        container.style.opacity = 0;
        container.style.transform = "translateY(20px)";
        setTimeout(() => {
            container.style.transition = "all 0.7s ease";
            container.style.opacity = 1;
            container.style.transform = "translateY(0)";
        }, 100);
    });
});

