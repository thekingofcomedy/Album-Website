//Store 20 albums for browse page
let currentBrowseAlbums = [];

//Store Details for Album Page
let currentDetailAlbum = null;

//Load Heard albums
let listeningHistory = JSON.parse(
  localStorage.getItem("listeningHistory") || "{}",
);

//Load saved reviews
let userReviews = JSON.parse(localStorage.getItem("userReviews") || "[]");

// Save data to local storage

//Saves Listening history to Local Storage
function saveListeningHistory() {
  localStorage.setItem("listeningHistory", JSON.stringify(listeningHistory));
}

//Save Reviews to Local Storage
function saveUserReviews() {
  localStorage.setItem("userReviews", JSON.stringify(userReviews));
}

//Checks if user has heard an album
function isAlbumHeard(albumId) {
  return albumId in listeningHistory;
}

//Add album to listening history
function addAlbumToHistory(album) {
  listeningHistory[album.collectionId] = album;
  saveListeningHistory();
}

//Remove album from listening history
function removeAlbumFromHistory(albumId) {
  delete listeningHistory[albumId];
  saveListeningHistory();
}

//Filters

//Single and EP Filter
function isFullAlbum(album) {
  return album.collectionType === "Album" && album.trackCount > 3;
}

//Date Conversion
function formatReleaseDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

//Filters out redundant tags like deluxe or explicit tags
function cleanAlbumTitle(title) {
  return title.split(" (")[0].split(" [")[0].trim();
}

//600x600 Album Cover Request
function getHighResCover(artworkUrl) {
  return artworkUrl.replace("100x100bb", "600x600bb");
}

//Assigns colours to different popularity score brackets
function applyScoreColor(element, score) {
  if (score >= 80) element.style.color = "#6FFF62";
  else if (score >= 70) element.style.color = "#BBFFA7";
  else if (score >= 50) element.style.color = "#FFE72F";
  else if (score >= 40) element.style.color = "#FF8914";
  else element.style.color = "#FF0000";
}

//GSAP Sort By dropdown Animation
function setupDropdownMenu(toggleBtn, dropdown) {
  if (!toggleBtn || !dropdown) return;

  const wrapper = toggleBtn.parentElement;

  //Sort by Fold down
  function openMenu() {
    gsap.killTweensOf(dropdown);
    dropdown.hidden = false;
    gsap.fromTo(
      dropdown,
      { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        opacity: 1,
        duration: 0.25,
        ease: "power3.out",
      },
    );
  }

  //Sort by Fold up
  function closeMenu() {
    if (dropdown.hidden) return;
    gsap.killTweensOf(dropdown);
    gsap.to(dropdown, {
      clipPath: "inset(0% 0% 100% 0%)",
      opacity: 0,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        dropdown.hidden = true;
      },
    });
  }

  //Sort by Event listener
  toggleBtn.addEventListener("click", () => {
    if (dropdown.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  //Close menu when clicking outside of it
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) closeMenu();
  });
}

//Last.FM API

const LASTFM_API_KEY = "0f90e7689f65b03e103f4fbacfd3773d";

//Converts scrobbles to a score out of 100 for the popularity score
function calculatePopularityScore(playcount) {
  const count = Number(playcount);
  if (!count) return 0;
  return Math.min(100, Math.round(Math.log10(count) * 12));
}

//Fetch scrobbles
async function fetchLastFmScore(artist, albumTitle) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(cleanAlbumTitle(albumTitle))}&autocorrect=1&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.album ? calculatePopularityScore(data.album.playcount) : 0;
  } catch (error) {
    console.warn("Last.fm lookup failed:", error);
    return 0;
  }
}

//Loads and Displays popularity score
async function showScore(element, album) {
  if (typeof album.popularityScore !== "number") {
    element.textContent = "--";
    album.popularityScore = await fetchLastFmScore(
      album.artistName,
      album.collectionName,
    );
  }
  element.textContent = album.popularityScore;
  applyScoreColor(element, album.popularityScore);
}

//Album Cards

//Place holder skeleton shimmer animation
function skeletonShimmer(container, count) {
  const template = document.getElementById("skeleton-card-template");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    container.appendChild(template.content.cloneNode(true));
  }
}

//Album card template render
function renderAlbumsToContainer(albums, containerId) {
  const container = document.getElementById(containerId);
  const template = document.getElementById("album-card-template");

  container.innerHTML = "";

  if (albums.length === 0) {
    container.innerHTML = "<p>No albums found.</p>";
    return;
  }

  albums.forEach((album) => {
    const card = template.content.cloneNode(true);
    const addBtn = card.querySelector(".add-btn");

    //Link album card to album detail page
    card.querySelectorAll("a").forEach((link) => {
      link.href += album.collectionId;
    });

    const cover = card.querySelector(".album-cover");
    cover.src = getHighResCover(album.artworkUrl100);
    cover.alt = album.collectionName;

    card.querySelector(".album-title").textContent = album.collectionName;
    card.querySelector(".artist-name").textContent = album.artistName;
    showScore(card.querySelector(".ratings-score"), album);

    addBtn.classList.toggle("added", isAlbumHeard(album.collectionId));
    addBtn.addEventListener("click", () => {
      if (isAlbumHeard(album.collectionId)) {
        removeAlbumFromHistory(album.collectionId);
      } else {
        addAlbumToHistory(album);
      }
      addBtn.classList.toggle("added");

      if (containerId === "browse-grid") applyBrowseSortAndFilter();
      if (containerId === "listening-grid-container") {
        loadListeningHistory();
      }
    });

    container.appendChild(card);
  });

  //Album card stagger animation
  gsap.from(container.querySelectorAll(".album-card"), {
    opacity: 0,
    y: 20,
    duration: 0.5,
    stagger: 0.06,
    ease: "power2.out",
    clearProps: "transform",
  });
}

//Fetch Home page albums
async function loadHomeSection(searchTerm, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  skeletonShimmer(container, 5);

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=25`,
    );
    const data = await response.json();
    const albums = data.results.filter(isFullAlbum).slice(0, 5);
    renderAlbumsToContainer(albums, containerId);
  } catch (error) {
    console.warn(`Error loading ${containerId}:`, error);
    container.innerHTML = "<p>Could not load albums.</p>";
  }
}

//Fetch Browse page albums
async function loadBrowseAlbums(searchTerm) {
  const grid = document.getElementById("browse-grid");
  skeletonShimmer(grid, 5);

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=50`,
    );
    const data = await response.json();

    //Filter duplicate albums / album variations
    const seen = new Set();
    currentBrowseAlbums = data.results
      .filter(isFullAlbum)
      .filter((album) => {
        const key =
          `${album.artistName}::${cleanAlbumTitle(album.collectionName)}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);

    //Fetch popularity scores for each album in parallel
    await Promise.all(
      currentBrowseAlbums.map(async (album) => {
        album.popularityScore = await fetchLastFmScore(
          album.artistName,
          album.collectionName,
        );
      }),
    );
  } catch (error) {
    console.warn("Error loading browse albums:", error);
    currentBrowseAlbums = [];
  }

  applyBrowseSortAndFilter();
}

//Browse page Sort By Filters
function applyBrowseSortAndFilter() {
  const grid = document.getElementById("browse-grid");
  const noResultsBox = document.getElementById("no-results-box");
  const searchQuery = new URLSearchParams(window.location.search).get("search");

  //No Results state
  const noResults = currentBrowseAlbums.length === 0 && searchQuery;
  grid.classList.toggle("hidden", Boolean(noResults));
  noResultsBox.classList.toggle("hidden", !noResults);
  if (noResults) {
    document.getElementById("no-results-text").textContent =
      `No Results For: "${searchQuery}"`;
    return;
  }

  const sortBy = document.querySelector('input[name="sort"]:checked').value;
  const filterBy = document.querySelector('input[name="filter"]:checked').value;

  const results = currentBrowseAlbums.filter((album) => {
    if (filterBy === "heard") return isAlbumHeard(album.collectionId);
    if (filterBy === "unheard") return !isAlbumHeard(album.collectionId);
    return true;
  });

  results.sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.releaseDate) - new Date(a.releaseDate);
    }
    if (sortBy === "oldest") {
      return new Date(a.releaseDate) - new Date(b.releaseDate);
    }
    return b.popularityScore - a.popularityScore;
  });

  renderAlbumsToContainer(results, "browse-grid");
}

//Browse Page Setup
function setupBrowsePage() {
  const section = document.getElementById("browse-section");
  const dropdown = section.querySelector(".sort-dropdown");

  setupDropdownMenu(section.querySelector(".sort-toggle-btn"), dropdown);
  dropdown.addEventListener("change", applyBrowseSortAndFilter);

  const searchQuery = new URLSearchParams(window.location.search).get("search");

  if (searchQuery) {
    document.getElementById("search-input").value = searchQuery;
    section.querySelector("h2").textContent = `Search Result: "${searchQuery}"`;
    loadBrowseAlbums(searchQuery);
  } else {
    loadBrowseAlbums("album");
  }
}

//Load users listening history
function loadListeningHistory() {
  const container = document.getElementById("listening-grid-container");

  //Display most recently listened to albums first
  const savedAlbums = Object.values(listeningHistory).reverse();

  //No albums in listening history state
  if (savedAlbums.length === 0) {
    container.innerHTML =
      "<p>No albums in your listening history yet. Click '+' on any album card to add it.</p>";
    return;
  }

  renderAlbumsToContainer(savedAlbums, "listening-grid-container");
}

//Album Detail Page

//Track list skeleton shimmer
function showTrackSkeletons(count = 10) {
  const container = document.getElementById("track-list-container");
  const template = document.getElementById("skeleton-track-template");
  if (!container || !template) return;

  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    container.appendChild(template.content.cloneNode(true));
  }
}

//Fetch album details and tracklist for Album Page
async function loadAlbumFromITunes(albumId) {
  showTrackSkeletons(10);

  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(albumId)}&entity=song`,
    );
    const data = await response.json();

    const album = data.results.find(
      (item) => item.wrapperType === "collection",
    );
    const tracks = data.results.filter((item) => item.kind === "song");

    populateAlbumMetadata(album);
    populateTracklist(tracks);
  } catch (error) {
    console.warn("Error loading album details:", error);
  }
}

//Album details on Album page
function populateAlbumMetadata(album) {
  currentDetailAlbum = album;

  const heardCheckbox = document.getElementById("heard-checkbox");
  const existingReview = userReviews.find(
    (review) => review.collectionId === album.collectionId,
  );

  document.title = `${album.collectionName} - ${album.artistName}`;

  const cover = document.querySelector(".album-showcase img");
  cover.onload = () => cover.classList.remove("skeleton");
  cover.src = getHighResCover(album.artworkUrl100);
  cover.alt = album.collectionName;

  document.getElementById("detail-title").textContent = album.collectionName;
  document.getElementById("detail-artist").textContent = album.artistName;
  document.getElementById("detail-date").textContent =
    ` ${formatReleaseDate(album.releaseDate)}`;
  document.getElementById("detail-genre").textContent =
    ` ${album.primaryGenreName}`;
  showScore(document.getElementById("detail-score"), album);

  //Fill review box with the users review if already reviewed
  if (existingReview) {
    document.getElementById("review-rating").value = existingReview.rating;
    document.getElementById("review-textarea").value = existingReview.text;
  }

  heardCheckbox.checked = isAlbumHeard(album.collectionId);
  heardCheckbox.addEventListener("change", () => {
    if (heardCheckbox.checked) {
      addAlbumToHistory(album);
    } else {
      removeAlbumFromHistory(album.collectionId);
    }
  });
}

//Populate tracklist on Album page
function populateTracklist(tracks) {
  const container = document.getElementById("track-list-container");
  const template = document.getElementById("track-item-template");

  container.innerHTML = "";

  tracks.forEach((track) => {
    const row = template.content.cloneNode(true);
    row.querySelector(".track-number").textContent = track.trackNumber;
    row.querySelector(".track-name").textContent = track.trackName;
    container.appendChild(row);
  });

  document.getElementById("detail-total-songs").textContent = tracks.length;
}

//Review Box setup
function setupReviewComposer() {
  const textarea = document.getElementById("review-textarea");
  const ratingInput = document.getElementById("review-rating");
  const heardCheckbox = document.getElementById("heard-checkbox");
  const postBtn = document.getElementById("post-review-btn");

  postBtn.addEventListener("click", () => {
    if (!currentDetailAlbum) return;

    //Lock rating between 0 and 100
    const rating = Math.max(0, Math.min(100, parseInt(ratingInput.value) || 0));
    ratingInput.value = rating;

    //Mark the album as heard when posting a review
    heardCheckbox.checked = true;
    addAlbumToHistory(currentDetailAlbum);

    const newReview = {
      collectionId: currentDetailAlbum.collectionId,
      collectionName: currentDetailAlbum.collectionName,
      artistName: currentDetailAlbum.artistName,
      artworkUrl100: currentDetailAlbum.artworkUrl100,
      rating: rating,
      text: textarea.value.trim(),
      timestamp: Date.now(),
    };

    //Update existing review or add new one
    const index = userReviews.findIndex(
      (review) => review.collectionId === newReview.collectionId,
    );
    if (index !== -1) {
      userReviews[index] = newReview;
    } else {
      userReviews.push(newReview);
    }
    saveUserReviews();

    postBtn.textContent = "Posted";
    setTimeout(() => {
      postBtn.textContent = "Post";
    }, 1500);
  });

  const upBtn = document.getElementById("rating-up-btn");
  const downBtn = document.getElementById("rating-down-btn");

  upBtn.addEventListener("click", () => {
    const current = parseInt(ratingInput.value) || 0;
    ratingInput.value = Math.min(100, current + 1);
  });

  downBtn.addEventListener("click", () => {
    const current = parseInt(ratingInput.value) || 0;
    ratingInput.value = Math.max(0, current - 1);
  });

  //Only numbers allowed in rating input
  ratingInput.addEventListener("input", () => {
    ratingInput.value = ratingInput.value.replace(/\D/g, "");
  });
}

//Profile Page

const REVIEW_CHAR_LIMIT = 420;

//User Reviews
function renderUserReviews() {
  const container = document.getElementById("review-list-container");
  const template = document.getElementById("review-card-template");
  const avgScoreEl = document.getElementById("dynamic-avg-score");

  container.innerHTML = "";

  if (userReviews.length === 0) {
    avgScoreEl.textContent = "--";
    container.innerHTML =
      "<p>No reviews posted yet. Open any album and click Post to add one.</p>";
    return;
  }

  //Average user review score
  const total = userReviews.reduce((sum, review) => sum + review.rating, 0);
  const average = Math.round(total / userReviews.length);
  avgScoreEl.textContent = average;
  applyScoreColor(avgScoreEl, average);

  const sortBy = document.querySelector(
    'input[name="review-sort"]:checked',
  ).value;

  //Review sorting
  const sortedReviews = userReviews.slice().sort((a, b) => {
    if (sortBy === "Oldest") return a.timestamp - b.timestamp;
    if (sortBy === "Highest") return b.rating - a.rating;
    if (sortBy === "Lowest") return a.rating - b.rating;
    return b.timestamp - a.timestamp;
  });

  //Render review card
  sortedReviews.forEach((review) => {
    const card = template.content.cloneNode(true);
    const textEl = card.querySelector(".review-text");
    const readMoreBtn = card.querySelector(".read-more-link");
    const scoreEl = card.querySelector("span.user-score");

    card.querySelectorAll("a").forEach((link) => {
      link.href += review.collectionId;
    });

    //Album Details
    const cover = card.querySelector(".review-album-cover");
    cover.src = getHighResCover(review.artworkUrl100);
    cover.alt = review.collectionName;

    card.querySelector(".review-album-title").textContent =
      review.collectionName;
    card.querySelector(".review-artist-name").textContent = review.artistName;

    scoreEl.textContent = review.rating;
    applyScoreColor(scoreEl, review.rating);

    if (!review.text) {
      textEl.textContent = "No Review";
      textEl.classList.add("no-review");
    } else {
      textEl.textContent = review.text;
    }

    //Read More hyperlink
    if (review.text.length > REVIEW_CHAR_LIMIT) {
      textEl.classList.add("clamped");
      readMoreBtn.addEventListener("click", () => {
        const isClamped = textEl.classList.toggle("clamped");
        readMoreBtn.textContent = isClamped ? "Read More" : "Show Less";
      });
    } else {
      readMoreBtn.remove();
    }

    container.appendChild(card);
  });
}

//Review History and Listening History Tabs
function setupProfileTabs() {
  const tabs = [
    {
      button: document.getElementById("btn-review-history"),
      view: document.getElementById("review-history-view"),
    },
    {
      button: document.getElementById("btn-listening-history"),
      view: document.getElementById("listening-history-review"),
    },
  ];

  tabs.forEach((tab) => {
    tab.button.addEventListener("click", () => {
      tabs.forEach((other) => {
        other.button.classList.toggle("active-tab", other === tab);
        other.view.classList.toggle("hidden", other !== tab);
      });
    });
  });
}

//Profile Page Setup
function setupProfilePage() {
  const reviewView = document.getElementById("review-history-view");
  const dropdown = reviewView.querySelector(".sort-dropdown");

  setupDropdownMenu(reviewView.querySelector(".sort-toggle-btn"), dropdown);
  dropdown.addEventListener("change", renderUserReviews);

  setupProfileTabs();
  renderUserReviews();
  loadListeningHistory();
}

//Page functionality initialization

//Default album ID for Album Page (Ye by Kanye West (Peak))
const DEFAULT_ALBUM_ID = "1392975931";

document.addEventListener("DOMContentLoaded", () => {
  loadHomeSection("trap", "recommended-row");
  loadHomeSection("2026", "new-music-row");
  loadHomeSection("pop", "popular-row");

  if (document.getElementById("browse-grid")) setupBrowsePage();

  if (document.getElementById("review-list-container")) setupProfilePage();

  if (document.getElementById("track-list-container")) {
    setupReviewComposer();
    const albumId =
      new URLSearchParams(window.location.search).get("id") || DEFAULT_ALBUM_ID;
    loadAlbumFromITunes(albumId);
  }
});
