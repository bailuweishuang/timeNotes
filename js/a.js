class Enum {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  init(name, age) {
    return `${name}: ${age}`;
  }
}

const Enum1 = new Enum();

module.exports = Enum1;
