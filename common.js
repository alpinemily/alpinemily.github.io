async function loadSite() {
  const res = await fetch("/data/site.json");
  const site = await res.json();
  document.querySelectorAll("[data-site-name]").forEach((el) => {
    el.textContent = site.name;
  });
  document.title = document.title.replace("Your Name", site.name);
  return site;
}

loadSite();
