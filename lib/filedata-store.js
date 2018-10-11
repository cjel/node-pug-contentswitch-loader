class FiledataStore {
  constructor() {
    this.titles = {}

  }
  getTitles()  {
    return this.titles
  }
  setTitle(file, title) {
    this.titles[file] = title
  }
}

module.exports = new FiledataStore()
