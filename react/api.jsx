// forwardRef的用法
// 转发引入REF 祖级想获取孙级的某个元素 就是隔代ref获取引用
const newFather = React.forwardRef((props, ref) => (
  <Father {...props} granRef={ref} />
));
class GrandFather extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return (
      <div>
        <newFather ref={(ref) => (this.node = ref)} />
      </div>
    );
  }
}

class Father extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return <Son granRef={this.props.granRef} />;
  }
}

class Son extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  render() {
    return <div ref={this.props.granRef}>222</div>;
  }
}
