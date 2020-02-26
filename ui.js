$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $userProfile = $("#user-profile");
  const $ownStories = $("#my-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $navLogin = $("#nav-login");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $navLogOut = $("#nav-logout");
  const $navUserProfile = $("#nav-user-profile");
  const $navWelcome = $("#nav-welcome");
  const $navMainLinks = $(".main-nav-links");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);

    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for creating a story.
   * If successfully we will add a story to the story list api and $body will refresh
   * the story list for us.
   */

  $submitForm.on("submit", async evt => {
    evt.preventDefault();

    let newStory = {
      author: $("#author").val(),
      title: $("#title").val(),
      url: $("#url").val(),
      username: currentUser.username
    };

    const storyObject = await storyList.addStory(currentUser, newStory);

    //rather than rewrite a stories html just use the generate stories
    await generateStories();
    createStoryandSubmitForm();
  });

  /**
   * Nav Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
    showNavForLoggedOutUser();
  });

  /**
   * Nav User-Profile Functionality
   */

  $navUserProfile.on("click", () => {
    hideElements();
    $userProfile.show();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event Handler for CLicking Submit
   */

  $navSubmit.on("click", () => {
    hideElements();
    $submitForm.slideToggle();
    $allStoriesList.show();
  });

  /**
   * Event Handler for clicking favorites
   */

  $navFavorites.on("click", () => {
    hideElements();
    generateFavorites();
    $favoritedArticles.show();
  });

  /**
   * Event Handler for clicking My Stories
   */

  $navMyStories.on("click", () => {
    hideElements();
    generateMyStories();
    $ownStories.show();
  });

  /**
   * Event Handler for Deleting a story
   */

  $ownStories.on("click", ".trash-can", async (evt) => {
    const $trashcanId = $(evt.target.closest("[id]")).attr("id");
    let msg = await storyList.removeStory(currentUser, $trashcanId);
    console.log(msg);
    generateMyStories();
  });

  /**
   * Event Handlers for Clicking Star Favorite
   */

  $(".articles-container").on("click", ".star", async evt => {
    if (currentUser) {
      const $favId = $(evt.target.closest("[id]")).attr("id");
      if ($(evt.target).hasClass("far")) {
        let msg = await currentUser.addFavoriteStory(
          currentUser.username,
          $favId,
          currentUser.loginToken
        );
      } else {
        let msg = await currentUser.deleteFavoriteStory(
          currentUser.username,
          $favId,
          currentUser.loginToken
        );
      }

      evt.target.classList.toggle("far");
      evt.target.classList.toggle("fas");
    }
  });

  /**
   * When articles are unfavorited while viewing the favorites list, remove them.
   */

  $("#favorited-articles").on("click", ".star", async evt => {
    const $favId = $(evt.target.closest("[id]")).attr("id");
    await currentUser.deleteFavoriteStory(
      currentUser.username,
      $favId,
      currentUser.loginToken
    );

    evt.target.classList.toggle("far");
    evt.target.classList.toggle("fas");

    generateFavorites();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      updateUserProfile();
    } else {
      showNavForLoggedOutUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    //update User Profile Info
    updateUserProfile();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function where user info is added to User Profile Info
   */

  function updateUserProfile() {
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(`Account Create: ${currentUser.createdAt.slice(0, 10)}`);
  }

  /**
   * A rendering function to reset add story forms
   */

  function createStoryandSubmitForm() {
    $submitForm.hide();

    $submitForm.trigger("reset");

    $allStoriesList.show();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starType;

    if(isFavorite(story)) {
      starType = "fas";
    } else {
      starType = "far";
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star">
          <i class="${starType} fa-star">
          </i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * A function to generate favorite stories list
   */

  function generateFavorites() {
    $favoritedArticles.empty();

    if (currentUser.favorites.length === 0) {
      $favoritedArticles.html("<p>No Favorites added!</p>");
    } else {
      for (let fav of currentUser.favorites) {
        $favoritedArticles.append(generateStoryHTML(fav));
      }
    }
  }

  /**
   * A function to generate my stories list
   */

  function generateMyStories() {
    $ownStories.empty();

    if (currentUser.ownStories.length === 0) {
      $ownStories.html("<p>No Stories added by user yet</p>");
    } else {
      for (let ownStory of currentUser.ownStories) {
        $ownStories.append(generateStoryHTML(ownStory));
        generateTrashcanHtml();
      }
    }
  }

  /**
   * Generate trashcan icon and replace the star icon when viewing my stories
   */

  function generateTrashcanHtml() {
    let $trashcan = $ownStories.children("li").children(".star");
    $trashcan.html('');
    $trashcan.removeClass('star');
    $trashcan.addClass('trash-can');
    $trashcan.append(`
     <i class="fas fa-trash-alt"></i>
      `);
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoritedArticles,
      $navMainLinks
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $navUserProfile.html(`${currentUser.username}`);
    $navWelcome.show();
    $navMainLinks.show();
    $allStoriesList.show();
  }

  function showNavForLoggedOutUser() {
    hideElements();
    $allStoriesList.show();
  }

  //I am having trouble coming up with my own implementation of this function
  //I have not used Sets very much previously so it's not normal for me to
  //use them as a tool.
  //The function pulls storyIds out of currentUser using map
  //then checks if the current story is the same as any of favorites
  //this returns true and sets the star to be filled in class.

  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      console.log(currentUser.favorites);
      favStoryIds = new Set(currentUser.favorites.map(fav => fav.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
