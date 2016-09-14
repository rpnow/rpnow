var RPRandom = (function() {

  var dictionary = {
    Title: [
      ":The :Nounss",
      ":The :Noun of :the :Nounss",
      ":The :Noun :Nounss",
      ":The :Adjective",
      ":The :Adjective :Nounss",
      ":The :Adjective :Adjective :Nounss",
      ":The :Adjective :Noun :Nounss",
      ":The :Noun's :Nounss",
      ":The :Noun's :Adjective :Nounss",
      ":My :Nounss",
      ":My :Adjective :Nounss",
      ":The :Nounss :Prep :Nounss",
      ":A :Noun :Prep :Nounss",
      ":Prep :the :Nounss",
      ":Prep :the :Adjective :Nounss",
      ":Prep :My :Nounss",
      ":Prep :My :Adjective :Nounss",
      ":Verb",
      ":Verbed",
      ":The :Verbing",
      ":Verbed by :the :Nounss",
      ":Verbed by the :Adjective",
      ":Verbed by :the :Adjective :Nounss",
      ":I :Verbed",
      ":Verbing :Prep :the :Nounss",
      ":Verbing :Prep :Verbing",
      ":Verbing :the :Nounss",
      ":Verbing :My :Nounss",
      ":Who :Verbed",
      ":Who :I :Verbed",
      ":IAm :Adjective",
      ":IAm Not :Adjective",
      ":IAm :the :Noun",
      ":IAm Not :the :Noun",
      ":Who :IAm",
      ":Who :IAm :Prep :the :Nounss",
      ":Who :IAm :Prep :the :Verbing",
      ":I :Will :Verb",
      ":I :Will be :Adjective",
      ":Who :Will :I :Verb",
      ":Nounss :Will :Verb",
      ":Nounss :Will :Verb :Nounss",
      ":Nounss :Will be :Adjective",
      ":Nounss :Will be :Nounss"
    ],
    the: [
      "the", ""
    ],
    The: [
      "The", ""
    ],
    A: [
      "A", ""
    ],
    I: [
      "I", "You", "He", "She", "We", "They", "It"
    ],
    IAm: [
      "I Am", "You Are", "He Is", "She Is", "We Are", "They Are", "It Is",
      "I Was", "You Were", "He Was", "She Was", "We Were", "They Were", "It Was"
    ],
    Me: [
      "Me", "You", "Him", "Her", "Us", "Them", "It"
    ],
    My: [
      "My", "Our", "Your", "His", "Her", "Their"
    ],
    Noun: [
      "Age", "Air", "Altar", "Amber", "Anchor", "Animal", "Anything", "Apology", "Authority", "Autumn",
      "Banana", "Bat", "Bean", "Bed", "Beginning", "Bell", "Bet", "Bit", "Blade", "Bone", "Book", "Box", "Boy", "Bread", "Breeze", "Bullet",
      "Cable", "Call", "Case", "Cat", "Carnival", "Chasm", "Chimney", "Circle", "City", "Conspiracy", "Contraband", "Contraption", "Clock", "Cloud", "Compass", "Core", "Creation", "Cure",
      "Danger", "Dawn", "District", "Dog",
      "Earth", "Echo", "Egg", "Elephant", "End", "Event", "Era", "Everything",
      "Farm", "Feeling", "Fish", "Fire", "Field", "Flash", "Flame", "Flight", "Flow", "Flute", "Forest", "Friend",
      "Game", "Gate", "Ghost", "Girl", "Glass", "Guitar",
      "Hand", "Haze", "Heart", "Heir", "Hint", "Horizon", "House",
      "Ice", "Invention", "Inventor", "Islands",
      "King", "Knife",
      "Land", "Laughter", "Leaf", "Letter", "Lesson", "License", "Light", "Lock", "Lord", "Love", "Luck",
      "Man", "Map", "Material", "Maze", "Memory", "Mind", "Mirror", "Moon", "Mountain",
      "Necture", "Note", "Nothing",
      "Ocean",
      "Page", "Pasture", "Penumbra", "Person", "Pilot", "Pioneer", "Plain", "Plane", "Pond", "Power", "Pulse",
      "Queen",
      "Reason", "Reflection", "Ring", "Ridge", "Rock",
      "Sailboat", "Seed", "Shade", "Shadow", "Ship", "Skull", "Sky", "Smile", "Something", "Someone", "Sound", "Soul", "Spider", "Spike", "Spoon", "Spout", "Spring", "Stable", "Stair", "Star", "Stone", "Stranger", "String", "Sugar",
      "Taste", "Tear", "Theme", "Theory", "Throne", "Time", "Touch", "Tree",
      "Ultimatum", "Umbrella",
      "Victory", "Vinegar", "Void", "Voyage",
      "Wand", "Wanderer", "Water", "Wedding", "Wind", "Wing", "Winter", "Wolf", "Word", "Worth", "Wraith", "Wrath", "Wrinkle",
      "Zone", "Zoo"
    ],
    Nouns: [
      "Ages", "Altars", "Anchors", "Animals", "Apologies", "Authorities", "Autumns",
      "Bananas", "Bats", "Beans", "Beds", "Beginnings", "Bells", "Bets", "Bits", "Blades", "Bones", "Books", "Boxes", "Boys", "Breezes", "Bullets",
      "Cables", "Calls", "Cases", "Cats", "Carnivals", "Chasms", "Chimneys", "Circles", "Cities", "Conspiracies", "Contraptions", "Clocks", "Clouds", "Compasses", "Cores", "Creations", "Cures",
      "Dangers", "Dawns", "Districts", "Dogs",
      "Echoes", "Eggs", "Elephants", "Ends", "Events", "Eras",
      "Farms", "Feelings", "Fishes", "Fires", "Fields", "Flashes", "Flames", "Flights", "Flows", "Flutes", "Forests", "Friends",
      "Games", "Gates", "Ghosts", "Girls", "Glasses", "Guitars",
      "Hands", "Hazes", "Hearts", "Heirs", "Hints", "Horizons", "Houses",
      "Inventions", "Inventors", "Islands",
      "Kings", "Knives",
      "Lands", "Leaves", "Letters", "Lessons", "Licenses", "Lights", "Locks", "Lords", "Loves", "Lucks",
      "Men", "Maps", "Materials", "Mazes", "Memories", "Minds", "Mirrors", "Moons", "Mountains",
      "Nectures", "Notes",
      "Oceans",
      "Pages", "Pastures", "People", "Pilots", "Pioneers", "Plains", "Planes", "Ponds", "Powers", "Pulses",
      "Queens",
      "Reasons", "Reflections", "Rings", "Ridges", "Rocks",
      "Sailboats", "Seeds", "Shades", "Shadows", "Ships", "Skulls", "Skies", "Smiles", "Somethings", "Sounds", "Souls", "Spiders", "Spikes", "Spoons", "Spouts", "Springs", "Stables", "Stairs", "Stars", "Stones", "Strangers", "Strings", "Sugars",
      "Tastes", "Tears", "Themes", "Theories", "Thrones", "Times", "Touches", "Trees",
      "Ultimatums", "Umbrellas",
      "Victories", "Voyages",
      "Wands", "Wanderers", "Waters", "Weddings", "Winds", "Wings", "Winters", "Wolves", "Words", "Wraiths", "Wrinkles",
      "Zones", "Zoos"
    ],
    Nounss: [
      ":Noun", ":Nouns"
    ],
    Prep: [
      "Above", "Across", "After", "Along", "Among", "Around",
      "Before", "Behind", "Below", "Beneath", "Between", "Betwixt", "Beyond",
      "From",
      "Into", "Inside",
      "Over",
      "Through",
      "Under", "Until", "Upon",
      "Without"
    ],
    Who: [
      "Who", "What", "When", "Where", "Why", "How", "Which"
    ],
    Will: [
      "Could", "Couldn't", "Could Not", "Will", "Won't", "Will Not", "Shall", "Shall Not"
    ],
    Adjective: [
      "Auburn", "Azure",
      "Beloved", "Blue", "Blonde", "Breezy",
      "Colored", "Cold", "Curious",
      "Dark", "Deep",
      "Enormous", "Envious",
      "Fallen", "First", "Formal",
      "Green",
      "Haunted", "Hectic", "Hidden", "Horrible", "Hot", "Humble", "Hungry",
      "Littlest", "Light", "Locked", "Lost",
      "Old",
      "Peculiar", "Periwinkle",
      "Quiet",
      "Rusty",
      "Sacred", "Scarlet", "Shady", "Shining", "Shy", "Silly", "Smallest", "Stalwart", "Strong", "Subtle",
      "Tattered", "Tiny", "Torn", "Tricky", "True",
      "Unfinished", "Unfortunate", "Unknown", "Unmarked", "Unbreakable",
      "Violet",
      "Wandering", "Warm", "Winding", "Wonderful", "Worst"
    ],
    Verb: [
      "Act", "Ascend", "Allow", "Arrange", "Attack", "Awaken",
      "Bail", "Buy",
      "Call", "Care", "Conspire", "Consume", "Created", "Crumble", "Crush", "Cry", "Cut",
      "Desire", "Doubt",
      "Encompass", "Entrust",
      "Fly", "Forget", "Freeze",
      "Keep",
      "Learn", "Leave", "Live", "Lock", "Look", "Lose", "Love",
      "Mend", "Miss", "Mold",
      "Pack",
      "Race", "Remove", "Revere", "Remember", "Run",
      "See", "Shine", "Start", "Steal",
      "Trust",
      "Wake", "Wear", "Wish",
    ],
    Verbed: [
      "Acted", "Ascended", "Allowed", "Arranged", "Attacked", "Awakened",
      "Bailed", "Bought",
      "Called", "Cared", "Conspired", "Consumed", "Created", "Crumbled", "Crushed", "Cried", "Cut",
      "Desired", "Doubted",
      "Encompassed", "Entrusted",
      "Flew", "Forgot", "Froze",
      "Kept",
      "Learnt", "Left", "Lived", "Locked", "Looked", "Lost", "Loved",
      "Mended", "Missed", "Molded",
      "Packed",
      "Raced", "Removed", "Revered", "Remembered", "Ran",
      "Saw", "Started", "Stole",
      "Trusted",
      "Woke", "Wore", "Wished",
    ],
    Verbing: [
      "Acting", "Ascending", "Allowing", "Arranging", "Attacking", "Awakening",
      "Bailing", "Buying",
      "Calling", "Caring", "Conspiring", "Consuming", "Creating", "Crumbling", "Crushing", "Crying", "Cutting",
      "Desiring", "Doubting",
      "Encompassing", "Entrusting",
      "Flying", "Forgetting", "Freezing",
      "Keeping",
      "Learning", "Leaving", "Living", "Locking", "Looking", "Losing", "Loving",
      "Mending", "Missing", "Molding",
      "Packing",
      "Racing", "Removing", "Revering", "Remembering", "Running",
      "Seeing", "Starting", "Stealing",
      "Trusting",
      "Waking", "Wearing", "Wishing",
    ],
  };

  // function for replacing individual terms in a string
  function dictRep(match, inner) {
    var x = dictionary[inner];
    if(x) return x[Math.floor(Math.random()*x.length)];
    else return inner.toUpperCase() + '?';
  }

  function resolve(str) {
    // resolve all terms
    do {
      var lastStr = str;
      str = str.replace(/:([a-zA-Z]+):?/, dictRep);
    } while(str !== lastStr);

    // remove extra spaces and return
    return str.trim().replace(/\s+/g, ' ');
  }

  function resolveShort(input, maxLength) {
    // keep resolving until it's short enough
    var str;
    do {
      str = resolve(input);
    } while(str.length > maxLength);
    return str;
  }

  return {
    title: function() {
      return resolve(":Title");
    },
    shortTitle: function(i) {
      return resolveShort(":Title", i);
    }
  };

})();