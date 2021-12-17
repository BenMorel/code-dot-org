import React from 'react';
import PropTypes from 'prop-types';
import Radium from 'radium';
import {connect} from 'react-redux';
import color from '../../util/color';
import styleConstants from '../../styleConstants';
import Button from '../Button';
import {navigateToHref} from '@cdo/apps/utils';

const SetUpMessage = props => {
  const {
    isRtl,
    headingText,
    descriptionText,
    className,
    buttonText,
    buttonUrl,
    buttonClass,
    onClick,
    solidBorder
  } = props;
  const localeStyle = isRtl ? styles.rtl : styles.ltr;
  const buttonLocaleStyle = isRtl ? styles.ltr : styles.rtl;
  const borderStyle = solidBorder ? styles.solidBorder : styles.dashedBorder;

  return (
    <div style={[styles.outerBox, borderStyle]} className={className}>
      <div style={[styles.wordBox, localeStyle]}>
        <div style={[styles.heading, localeStyle]}>{headingText}</div>
        <div style={[styles.description, localeStyle]}>{descriptionText}</div>
      </div>
      <Button
        onClick={onClick || (() => navigateToHref(buttonUrl))}
        className={buttonClass}
        color={Button.ButtonColor.gray}
        text={buttonText}
        style={[styles.button, buttonLocaleStyle]}
      />
      <div style={styles.clear} />
    </div>
  );
};

SetUpMessage.defaultProps = {
  buttonColor: Button.ButtonColor.gray
};

SetUpMessage.propTypes = {
  isRtl: PropTypes.bool,
  headingText: PropTypes.string.isRequired,
  descriptionText: PropTypes.string.isRequired,
  className: PropTypes.string,
  buttonText: PropTypes.string.isRequired,
  buttonUrl: PropTypes.string,
  buttonClass: PropTypes.string,
  buttonColor: PropTypes.oneOf(Object.keys(Button.ButtonColor)),
  onClick: PropTypes.func,
  solidBorder: PropTypes.bool
};

const styles = {
  outerBox: {
    width: styleConstants['content-width'],
    backgroundColor: color.white,
    borderColor: color.border_gray,
    boxSizing: 'border-box',
    marginBottom: 20,
    float: 'left'
  },
  solidBorder: {
    borderStyle: 'solid',
    borderWidth: 1
  },
  dashedBorder: {
    borderStyle: 'dashed',
    borderWidth: 5
  },
  wordBox: {
    width: styleConstants['content-width'] - 285,
    paddingLeft: 25,
    paddingRight: 25
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Gotham 5r',
    fontWeight: 'bold',
    color: color.teal,
    paddingTop: 25
  },
  description: {
    fontSize: 14,
    color: color.charcoal,
    width: styleConstants['content-width'] - 280,
    paddingTop: 5,
    paddingBottom: 25
  },
  button: {
    marginTop: 28,
    marginLeft: 25,
    marginRight: 25
  },
  ltr: {
    float: 'left'
  },
  rtl: {
    float: 'right'
  },
  clear: {
    clear: 'both'
  }
};

export const UnconnectedSetUpMessage = SetUpMessage;

export default connect(state => ({
  isRtl: state.isRtl
}))(Radium(SetUpMessage));
