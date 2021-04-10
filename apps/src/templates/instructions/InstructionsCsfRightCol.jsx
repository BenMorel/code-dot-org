import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Radium from 'radium';
import {connect} from 'react-redux';
import CollapserButton from './CollapserButton';
import ScrollButtons from './ScrollButtons';
import commonStyles from '../../commonStyles';
import styleConstants from '../../styleConstants';
import {getOuterHeight} from './utils';

const HEADER_HEIGHT = styleConstants['workspace-headers-height'];
const RESIZER_HEIGHT = styleConstants['resize-bar-width'];

// Minecraft-specific styles
const craftStyles = {
  collapserButton: {
    padding: 5,
    marginBottom: 0
  },
  scrollButtons: {
    left: 38
  },
  scrollButtonsRtl: {
    right: 38
  }
};

const styles = {
  collapserButton: {
    position: 'absolute',
    right: 0,
    marginTop: 5,
    marginRight: 5
  },
  scrollButtons: {
    margin: '0px 5px',
    minWidth: '40px'
  },
  scrollButtonsBelowCollapser: {
    position: 'relative',
    top: 50,
    margin: '0px'
  }
};

class InstructionsCsfRightCol extends React.Component {
  static propTypes = {
    shouldDisplayHintPrompt: PropTypes.func.isRequired,
    hasShortInstructions: PropTypes.bool.isRequired,
    promptForHint: PropTypes.bool.isRequired,
    displayScrollButtons: PropTypes.bool.isRequired,
    getScrollTarget: PropTypes.func.isRequired,
    handleClickCollapser: PropTypes.func.isRequired,
    setColWidth: PropTypes.func.isRequired,
    setColHeight: PropTypes.func.isRequired,

    // from redux
    collapsed: PropTypes.bool.isRequired,
    hints: PropTypes.arrayOf(
      PropTypes.shape({
        hintId: PropTypes.string.isRequired,
        markdown: PropTypes.string.isRequired,
        block: PropTypes.object, // XML
        video: PropTypes.string
      })
    ).isRequired,
    feedback: PropTypes.shape({
      message: PropTypes.string.isRequired,
      isFailure: PropTypes.bool
    }),
    longInstructions: PropTypes.string,
    height: PropTypes.number.isRequired,
    isMinecraft: PropTypes.bool.isRequired,
    isRtl: PropTypes.bool.isRequired
  };

  componentDidMount() {
    this.updateDimensions();
  }

  componentDidUpdate() {
    this.updateDimensions();
  }

  updateDimensions() {
    this.props.setColWidth(this.getColumnWidth());
    this.props.setColHeight(this.getColumnHeight());
  }

  shouldDisplayCollapserButton() {
    // if we have "extra" (non-instruction) content, we should always
    // give the option of collapsing it
    const hasExtraContent =
      this.props.hints.length ||
      this.props.shouldDisplayHintPrompt() ||
      this.props.feedback;

    // Otherwise, only show the button if we have two versions of
    // instruction we want to toggle between
    const hasShortAndLongInstructions =
      this.props.longInstructions && this.props.hasShortInstructions;

    return hasExtraContent || hasShortAndLongInstructions;
  }

  getColumnWidth() {
    const collapserWidth = this.shouldDisplayCollapserButton()
      ? $(ReactDOM.findDOMNode(this.collapser)).outerWidth(true)
      : 0;
    const scrollButtonWidth = this.props.displayScrollButtons
      ? $(ReactDOM.findDOMNode(this.scrollButtons)).outerWidth(true)
      : 0;
    const width = Math.max(collapserWidth, scrollButtonWidth);
    return width;
  }

  // do I need collapse param?
  getColumnHeight(collapsed = this.props.collapsed) {
    const collapseButtonHeight = getOuterHeight(this.collapser, true);
    const scrollButtonsHeight =
      !collapsed && this.scrollButtons ? this.scrollButtons.getMinHeight() : 0;
    return collapseButtonHeight + scrollButtonsHeight;
  }

  render() {
    const scrollButtonsHeight =
      this.props.height -
      HEADER_HEIGHT -
      RESIZER_HEIGHT -
      (this.shouldDisplayCollapserButton()
        ? styles.scrollButtonsBelowCollapser.top
        : 0);

    return (
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <CollapserButton
          ref={c => {
            this.collapser = c;
          }}
          style={[
            styles.collapserButton,
            this.props.isMinecraft && craftStyles.collapserButton,
            !this.shouldDisplayCollapserButton() && commonStyles.hidden
          ]}
          collapsed={this.props.collapsed}
          onClick={this.props.handleClickCollapser}
          isMinecraft={this.props.isMinecraft}
          isRtl={this.props.isRtl}
        />
        {this.props.displayScrollButtons && (
          <ScrollButtons
            style={[
              styles.scrollButtons,
              this.props.isMinecraft &&
                (this.props.isRtl
                  ? craftStyles.scrollButtonsRtl
                  : craftStyles.scrollButtons),
              this.shouldDisplayCollapserButton() &&
                styles.scrollButtonsBelowCollapser
            ]}
            ref={c => {
              this.scrollButtons = c;
            }}
            getScrollTarget={this.props.getScrollTarget}
            visible={true}
            height={scrollButtonsHeight}
            isMinecraft={this.props.isMinecraft}
          />
        )}
      </div>
    );
  }
}

export default connect(
  function propsFromStore(state) {
    return {
      collapsed: state.instructions.isCollapsed,
      hints: state.authoredHints.seenHints,
      feedback: state.instructions.feedback,
      longInstructions: state.instructions.longInstructions,
      height: state.instructions.renderedHeight,
      isMinecraft: !!state.pageConstants.isMinecraft,
      isRtl: state.isRtl
    };
  },
  null,
  null,
  {withRef: true}
)(Radium(InstructionsCsfRightCol));
