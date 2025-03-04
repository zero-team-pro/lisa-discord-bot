import React from 'react';

import styles from './styles.module.scss';

import cn from 'classnames/bind';

const cx = cn.bind(styles);

interface IProps {
  isError?: boolean;
}

const Empty: React.FC<IProps> = (props: IProps) => {
  const { isError = false } = props;
  return <div className={cx('empty')}>{isError ? <h2>Error occurred</h2> : <h2>Nothing found</h2>}</div>;
};

export { Empty };
