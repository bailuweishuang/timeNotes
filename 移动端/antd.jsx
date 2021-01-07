import React from "react";
import ReactDOM from "react-dom";
import "./index.less";
import { ListView } from "antd-mobile";
import { getCollectionList, cancelCollection } from "utils/api";
import PDF from "../documentContent/pdf";
import { getFile } from "utils/api";
import { getImgeUrl } from "utils/http";
const NUM_ROWS = 20;
class DocumentCollection extends React.Component {
  constructor(props) {
    super(props);
    const dataSource = new ListView.DataSource({
      rowHasChanged: (row1, row2) => row1 !== row2,
    });
    this.state = {
      dataSource,
      dataRSource: [],
      isLoading: true,
      height: document.documentElement.clientHeight,
      pageNumber: 0,
      pdfStatus: false,
      type: "",
      imgUrl: "",
      pdfId: "",
    };
  }

  async componentDidMount() {
    const hei = this.state.height - ReactDOM.findDOMNode(this.lv).offsetTop;
    const result = await getCollectionList({
      page: 0,
      pageSize: NUM_ROWS,
    });
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(result),
      dataRSource: [...result],
      height: hei,
      isLoading: false,
    });
  }

  onEndReached = async () => {
    const { pageNumber, dataRSource } = this.state;
    if (this.state.isLoading) {
      return;
    }
    this.setState({ isLoading: true });
    const result = await getCollectionList({
      page: pageNumber + 1,
      pageSize: NUM_ROWS,
    });
    const rData = [...dataRSource, ...result];
    if (result.length === 0) {
      this.setState({ isLoading: false });
      return;
    }
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(rData),
      pageNumber: pageNumber + 1,
      isLoading: false,
      dataRSource: rData,
    });
  };

  // 取消收藏
  cancelCollection = async (fileId) => {
    const { dataRSource } = this.state;
    await cancelCollection({
      fileId,
    });
    const newArr = dataRSource.filter((item) => item.fileId !== fileId);
    // antd-mobile对此做了性能优化，并不是每次render都会触发rowHasChanged,
    // 所以dataSource重新赋值
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(
        JSON.parse(JSON.stringify(newArr))
      ),
      dataRSource: newArr,
    });
  };
  render() {
    const { imgUrl, pdfStatus, type, pdfId } = this.state;
    const row = (rowData) => {
      const { collectTime, fileName, collectType, fileId, format } = rowData;
      return (
        <div key={fileId} className="documentList">
          {/* 
          关键字高亮
          <p
            className="name"
            dangerouslySetInnerHTML={{
              __html: fileName
                .split(searchValueheigh)
                .join(`<span class="keyWord">${searchValueheigh}</span>`),
            }}
          /> */}
          <div className={`listIcon other`}></div>
          <div className="list-content">
            <div
              style={{ flex: 1 }}
              onClick={async () => {
                const imgArr = ["png", "jpg", "jpeg", "bmp", "gif"];
                let url = await getFile();
                if (imgArr.indexOf(format) > -1) {
                  let result = await getImgeUrl(url, fileId);
                  this.setState({
                    imgUrl: result,
                    pdfStatus: true,
                    type: "img",
                  });
                } else {
                  this.setState({
                    pdfStatus: true,
                    pdfId: `${url}?fileId=${fileId}`,
                    type: "pdf",
                  });
                }
              }}
            >
              <p className="name">
                {fileName}
                {collectType === "0" ? <span className="tick" /> : null}
              </p>
              <p className="time">{collectTime}</p>
            </div>
            {collectType === "1" ? null : (
              <p
                className="collection"
                onClick={() => this.cancelCollection(fileId)}
              >
                取消收藏
              </p>
            )}
          </div>
        </div>
      );
    };
    return (
      <div className="documentCollection">
        {pdfStatus ? (
          <PDF
            pdfId={pdfId}
            imgUrl={imgUrl}
            type={type}
            onCancel={() => {
              this.setState({
                pdfStatus: false,
              });
            }}
          />
        ) : null}
        <div className="contentTop">
          <div
            className="titleReturn"
            onClick={() => this.props.history.push("/home")}
          ></div>
          <span className="title">文档收藏</span>
        </div>
        <div className="pullToRefreshList">
          <ListView
            ref={(el) => (this.lv = el)}
            dataSource={this.state.dataSource}
            renderFooter={() => (
              <div style={{ padding: 8, textAlign: "center" }}></div>
            )}
            renderRow={row}
            style={{
              height: this.state.height,
            }}
            onEndReached={this.onEndReached}
            pageSize={5}
            initialListSize={20}
            onEndReachedThreshold={20}
          />
        </div>
      </div>
    );
  }
}

export default DocumentCollection;
